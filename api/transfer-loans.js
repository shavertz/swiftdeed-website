import Anthropic from '@anthropic-ai/sdk';
import { preparePostRequest } from './lib/http.js';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLOSING_PROMPT = `You are reading a closing document for a commercial real estate loan. Extract the following fields and return ONLY raw JSON with no markdown or explanation:
borrower_name, property_address, original_loan_amount, interest_rate, loan_type, maturity_date, loan_origination_date, first_payment_date, monthly_payment, guarantor_name, loan_id.
Use numbers only for money and rates. Use MM/DD/YYYY for dates. Return null for any field not found.
If this is a Commercial Guaranty document, the guarantor_name is the individual who is personally guaranteeing the loan — look for language like "personally guarantees", "Guarantor:", or a signature block with an individual's name. Extract that individual's full name as guarantor_name.
If current_principal_balance is not found, use original_loan_amount as the fallback value for current_principal_balance.
Extract first_payment_date from the closing documents and use it as a fallback for next_payment_date if no servicer statement provides one.`;

const SERVICER_PROMPT = `You are reading a servicer statement (payoff statement or monthly statement) for a commercial real estate loan. Extract the following fields and return ONLY raw JSON with no markdown or explanation:
borrower_name, property_address, current_principal_balance, interest_rate, next_payment_date, per_diem, interest_paid_to_date, loan_id, servicer_name.
Use numbers only for money and rates. Use MM/DD/YYYY for dates. Return null for any field not found.`;

const HISTORY_PROMPT = `You are reading a payment history export or spreadsheet for one or more commercial real estate loans. Extract loan-level data when present and an array of payment records. Return ONLY raw JSON with no markdown or explanation.
Return: { loans: [ { borrower_name, property_address, loan_id, original_loan_amount, current_principal_balance, interest_rate, loan_type, maturity_date, loan_origination_date, monthly_payment, guarantor_name, next_payment_date, per_diem, interest_paid_to_date, payments: [ { date, amount, principal, interest, balance_after } ] } ] }
Use numbers only for money and rates. Use MM/DD/YYYY for dates. Return null for any field not found.`;

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function date(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function monthDiff(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

function calculatedMonthlyPayment(loan) {
  if (loan.monthly_payment) return loan.monthly_payment;
  const principal = num(loan.original_loan_amount || loan.current_principal_balance);
  const rate = num(loan.interest_rate);
  if (!principal || !rate) return null;
  const monthlyRate = rate / 100 / 12;
  const months = loan.loan_origination_date && loan.maturity_date
    ? monthDiff(loan.loan_origination_date, loan.maturity_date)
    : 0;
  if (months > 1 && monthlyRate > 0) {
    return Math.round((principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))) * 100) / 100;
  }
  return Math.round((principal * monthlyRate) * 100) / 100;
}

function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  return 0;
}

function matchScore(a, b) {
  return Math.max(
    similarity(a.borrower_name, b.borrower_name),
    similarity(a.property_address, b.property_address),
    a.loan_id && b.loan_id && normalize(a.loan_id) === normalize(b.loan_id) ? 1 : 0
  );
}

function extractLoanIdFromUrl(url) {
  const fileName = decodeURIComponent(String(url || '').split('/').pop() || '');
  const match = fileName.match(/(?:loan[_\-\s]?)?((?:[A-Z]{2,10}[_\-]\d{4}[_\-]\d{3,}))/i);
  if (!match) return null;
  return match[1].replace(/_/g, '-').toUpperCase().trim();
}

function borrowerPropertyMatch(a, b) {
  return similarity(a.property_address, b.property_address) >= 0.8;
}

function populatedFieldCount(loan) {
  return [
    'borrower_name',
    'property_address',
    'original_loan_amount',
    'interest_rate',
    'loan_type',
    'maturity_date',
    'loan_origination_date',
    'first_payment_date',
    'monthly_payment',
    'guarantor_name',
    'loan_id',
    'current_principal_balance',
    'next_payment_date',
    'per_diem',
    'interest_paid_to_date',
  ].reduce((count, field) => count + (loan[field] !== null && loan[field] !== undefined && loan[field] !== '' ? 1 : 0), 0);
}

function emptyLoanRecord() {
  return {
    borrower_name: null,
    property_address: null,
    original_loan_amount: null,
    interest_rate: null,
    loan_type: null,
    maturity_date: null,
    loan_origination_date: null,
    first_payment_date: null,
    monthly_payment: null,
    guarantor_name: null,
    loan_id: null,
    current_principal_balance: null,
    next_payment_date: null,
    per_diem: null,
    interest_paid_to_date: null,
    closing_doc_urls: [],
    servicer_statement_urls: [],
    payment_history_urls: [],
    payments: [],
  };
}

function mergeLoanRecords(primary, duplicate) {
  [
    'borrower_name',
    'property_address',
    'original_loan_amount',
    'interest_rate',
    'loan_type',
    'maturity_date',
    'loan_origination_date',
    'first_payment_date',
    'monthly_payment',
    'guarantor_name',
    'loan_id',
    'current_principal_balance',
    'next_payment_date',
    'per_diem',
    'interest_paid_to_date',
  ].forEach(field => {
    if ((primary[field] === null || primary[field] === undefined || primary[field] === '') && duplicate[field]) {
      primary[field] = duplicate[field];
    }
  });

  primary.closing_doc_urls = [...new Set([...(primary.closing_doc_urls || []), ...(duplicate.closing_doc_urls || [])])];
  primary.servicer_statement_urls = [...new Set([...(primary.servicer_statement_urls || []), ...(duplicate.servicer_statement_urls || [])])];
  primary.payment_history_urls = [...new Set([...(primary.payment_history_urls || []), ...(duplicate.payment_history_urls || [])])];
  primary.payments = primary.payments?.length ? primary.payments : (duplicate.payments || []);
  return primary;
}

function recordFromExtraction(result, type, url, fileLoanId) {
  const record = emptyLoanRecord();
  record.borrower_name = result.borrower_name || null;
  record.property_address = result.property_address || null;
  record.original_loan_amount = num(result.original_loan_amount);
  record.interest_rate = num(result.interest_rate);
  record.loan_type = result.loan_type || null;
  record.maturity_date = date(result.maturity_date);
  record.loan_origination_date = date(result.loan_origination_date);
  record.first_payment_date = date(result.first_payment_date);
  record.monthly_payment = num(result.monthly_payment);
  record.guarantor_name = result.guarantor_name || null;
  record.loan_id = result.loan_id || fileLoanId || null;
  record.current_principal_balance = num(result.current_principal_balance);
  record.next_payment_date = date(result.next_payment_date);
  record.per_diem = num(result.per_diem);
  record.interest_paid_to_date = num(result.interest_paid_to_date);
  record.payments = result.payments || [];
  if (type === 'closing') record.closing_doc_urls = [url];
  if (type === 'servicer') record.servicer_statement_urls = [url];
  if (type === 'history') record.payment_history_urls = [url];
  return record;
}

async function extractFromUrl(url, prompt) {
  try {
    const fileResponse = await fetch(url);
    if (!fileResponse.ok) return null;
    const contentType = fileResponse.headers.get('content-type') || '';
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const lowerUrl = String(url).toLowerCase();

    if (contentType.includes('text/') || lowerUrl.includes('.csv') || lowerUrl.includes('.txt')) {
      const text = buffer.toString('utf8');
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: `${prompt}\n\nDocument text:\n${text.slice(0, 120000)}` }],
      });
      const raw = response.content?.[0]?.text || '{}';
      const json = raw.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      return JSON.parse(json);
    }

    const data = buffer.toString('base64');
    const mediaType = lowerUrl.includes('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : lowerUrl.includes('.xls')
        ? 'application/vnd.ms-excel'
        : 'application/pdf';
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: prompt },
      ]}],
    });
    const raw = response.content?.[0]?.text || '{}';
    const json = raw.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
    return JSON.parse(json);
  } catch (e) {
    console.error('Extraction error:', e.message);
    return null;
  }
}

async function extractInBatches(urls, prompt, batchSize = 4) {
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(url => extractFromUrl(url, prompt)));
    results.push(...batchResults);
    if (i + batchSize < urls.length) await new Promise(r => setTimeout(r, 2000));
  }
  return results;
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { closingDocUrls = [], servicerStatementUrls = [], paymentHistoryUrls = [], lenderEmail } = req.body || {};

    if (!lenderEmail) return res.status(400).json({ error: 'Missing lenderEmail' });
    if (!closingDocUrls.length && !servicerStatementUrls.length && !paymentHistoryUrls.length) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const closingResults = await extractInBatches(closingDocUrls, CLOSING_PROMPT);
    const servicerResults = await extractInBatches(servicerStatementUrls, SERVICER_PROMPT);
    const historyResults = await extractInBatches(paymentHistoryUrls, HISTORY_PROMPT);

    const entries = [
      ...closingResults.map((result, i) => ({ result, type: 'closing', url: closingDocUrls[i], fileLoanId: extractLoanIdFromUrl(closingDocUrls[i]) })).filter(e => e.result),
      ...servicerResults.map((result, i) => ({ result, type: 'servicer', url: servicerStatementUrls[i], fileLoanId: extractLoanIdFromUrl(servicerStatementUrls[i]) })).filter(e => e.result),
      ...historyResults.flatMap((result, i) => {
        if (!result) return [];
        const fileLoanId = extractLoanIdFromUrl(paymentHistoryUrls[i]);
        const historyLoans = Array.isArray(result.loans) && result.loans.length ? result.loans : [result];
        return historyLoans.map(loan => ({ result: loan, type: 'history', url: paymentHistoryUrls[i], fileLoanId }));
      }),
    ];

    const idGroups = new Map();
    const unmatchedEntries = [];
    entries.forEach(entry => {
      if (entry.fileLoanId) {
        const group = idGroups.get(entry.fileLoanId) || [];
        group.push(entry);
        idGroups.set(entry.fileLoanId, group);
      } else {
        unmatchedEntries.push(entry);
      }
    });

    const borrowerPropertyGroups = [];
    unmatchedEntries.forEach(entry => {
      const match = borrowerPropertyGroups.find(group => borrowerPropertyMatch(group.seed, entry.result));
      if (match) {
        match.entries.push(entry);
      } else {
        borrowerPropertyGroups.push({ seed: entry.result, entries: [entry] });
      }
    });

    const groupedEntries = [
      ...Array.from(idGroups.values()),
      ...borrowerPropertyGroups.map(group => group.entries),
    ];

    const dedupedLoans = groupedEntries.map(group => {
      return group.reduce((loan, entry) => {
        return mergeLoanRecords(loan, recordFromExtraction(entry.result, entry.type, entry.url, entry.fileLoanId));
      }, emptyLoanRecord());
    }).reduce((loans, loan) => {
      const matchIndex = loans.findIndex(existing => (
        (existing.loan_id && loan.loan_id && normalize(existing.loan_id) === normalize(loan.loan_id)) ||
        borrowerPropertyMatch(existing, loan)
      ));
      if (matchIndex === -1) return [...loans, loan];

      const existing = loans[matchIndex];
      const primary = populatedFieldCount(existing) >= populatedFieldCount(loan) ? existing : loan;
      const duplicate = primary === existing ? loan : existing;
      loans[matchIndex] = mergeLoanRecords(primary, duplicate);
      return loans;
    }, []);

    const loans = dedupedLoans.map((loan, idx) => {
      if (!loan.current_principal_balance && loan.original_loan_amount) loan.current_principal_balance = loan.original_loan_amount;
      if (!loan.next_payment_date && loan.first_payment_date) loan.next_payment_date = loan.first_payment_date;
      if (!loan.monthly_payment) loan.monthly_payment = calculatedMonthlyPayment(loan);
      const missing = [];
      if (!loan.borrower_name) missing.push('borrower_name');
      if (!loan.property_address) missing.push('property_address');
      if (!loan.original_loan_amount) missing.push('original_loan_amount');
      if (!loan.current_principal_balance) missing.push('current_principal_balance');
      if (!loan.interest_rate) missing.push('interest_rate');
      if (!loan.loan_type) missing.push('loan_type');
      if (!loan.maturity_date) missing.push('maturity_date');
      if (!loan.monthly_payment) missing.push('monthly_payment');
      if (!loan.guarantor_name) missing.push('guarantor_name');
      if (!loan.next_payment_date) missing.push('next_payment_date');

      return {
        _id: `transfer_${idx}`,
        ...loan,
        missing,
        complete: missing.length === 0,
      };
    });

    return res.status(200).json({ success: true, loans });
  } catch (e) {
    console.error('Transfer extraction error:', e);
    return res.status(500).json({ error: e.message });
  }
}
