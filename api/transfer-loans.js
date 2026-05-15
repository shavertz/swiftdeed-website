import Anthropic from '@anthropic-ai/sdk';
import { preparePostRequest } from './lib/http.js';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLOSING_PROMPT = `You are reading a closing document for a commercial real estate loan. Extract the following fields and return ONLY raw JSON with no markdown or explanation:
borrower_name, property_address, original_loan_amount, interest_rate, loan_type, maturity_date, loan_origination_date, monthly_payment, guarantor_name, loan_id.
Use numbers only for money and rates. Use MM/DD/YYYY for dates. Return null for any field not found.`;

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

function populatedFieldCount(loan) {
  return [
    'borrower_name',
    'property_address',
    'original_loan_amount',
    'interest_rate',
    'loan_type',
    'maturity_date',
    'loan_origination_date',
    'monthly_payment',
    'guarantor_name',
    'loan_id',
    'current_principal_balance',
    'next_payment_date',
    'per_diem',
    'interest_paid_to_date',
  ].reduce((count, field) => count + (loan[field] !== null && loan[field] !== undefined && loan[field] !== '' ? 1 : 0), 0);
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

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { closingDocUrls = [], servicerStatementUrls = [], paymentHistoryUrls = [], lenderEmail } = req.body || {};

    if (!lenderEmail) return res.status(400).json({ error: 'Missing lenderEmail' });
    if (!closingDocUrls.length && !servicerStatementUrls.length && !paymentHistoryUrls.length) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const [closingResults, servicerResults, historyResults] = await Promise.all([
      Promise.all(closingDocUrls.map(url => extractFromUrl(url, CLOSING_PROMPT))),
      Promise.all(servicerStatementUrls.map(url => extractFromUrl(url, SERVICER_PROMPT))),
      Promise.all(paymentHistoryUrls.map(url => extractFromUrl(url, HISTORY_PROMPT))),
    ]);

    const loanMap = {};
    closingResults.filter(Boolean).forEach((r, i) => {
      const key = normalize(r.borrower_name || '') + normalize(r.property_address || '');
      if (!key) return;
      if (!loanMap[key]) {
        loanMap[key] = {
          borrower_name: r.borrower_name || null,
          property_address: r.property_address || null,
          original_loan_amount: num(r.original_loan_amount),
          interest_rate: num(r.interest_rate),
          loan_type: r.loan_type || null,
          maturity_date: date(r.maturity_date),
          loan_origination_date: date(r.loan_origination_date),
          monthly_payment: num(r.monthly_payment),
          guarantor_name: r.guarantor_name || null,
          loan_id: r.loan_id || null,
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
      loanMap[key].closing_doc_urls.push(closingDocUrls[i]);
      if (!loanMap[key].guarantor_name && r.guarantor_name) loanMap[key].guarantor_name = r.guarantor_name;
      if (!loanMap[key].loan_type && r.loan_type) loanMap[key].loan_type = r.loan_type;
    });

    servicerResults.filter(Boolean).forEach((r, i) => {
      const candidates = Object.values(loanMap);
      let best = null;
      let bestScore = 0;
      candidates.forEach(c => {
        const score = matchScore(c, r);
        if (score > bestScore) { bestScore = score; best = c; }
      });

      if (best && bestScore >= 0.5) {
        best.current_principal_balance = num(r.current_principal_balance) || best.current_principal_balance;
        best.next_payment_date = date(r.next_payment_date) || best.next_payment_date;
        best.per_diem = num(r.per_diem) || best.per_diem;
        best.interest_paid_to_date = num(r.interest_paid_to_date) || best.interest_paid_to_date;
        if (!best.interest_rate && r.interest_rate) best.interest_rate = num(r.interest_rate);
        best.servicer_statement_urls.push(servicerStatementUrls[i]);
      } else {
        const key = normalize(r.borrower_name || '') + normalize(r.property_address || '') + '_servicer';
        loanMap[key] = {
          borrower_name: r.borrower_name || null,
          property_address: r.property_address || null,
          original_loan_amount: null,
          interest_rate: num(r.interest_rate),
          loan_type: null,
          maturity_date: null,
          loan_origination_date: null,
          monthly_payment: null,
          guarantor_name: null,
          loan_id: r.loan_id || null,
          current_principal_balance: num(r.current_principal_balance),
          next_payment_date: date(r.next_payment_date),
          per_diem: num(r.per_diem),
          interest_paid_to_date: num(r.interest_paid_to_date),
          closing_doc_urls: [],
          servicer_statement_urls: [servicerStatementUrls[i]],
          payment_history_urls: [],
          payments: [],
        };
      }
    });

    historyResults.filter(Boolean).forEach((r, i) => {
      const historyLoans = r.loans || [];
      historyLoans.forEach(hl => {
        const candidates = Object.values(loanMap);
        let best = null;
        let bestScore = 0;
        candidates.forEach(c => {
          const score = matchScore(c, hl);
          if (score > bestScore) { bestScore = score; best = c; }
        });
        if (best && bestScore >= 0.5) {
          best.original_loan_amount = num(hl.original_loan_amount) || best.original_loan_amount;
          best.current_principal_balance = num(hl.current_principal_balance) || best.current_principal_balance;
          best.interest_rate = num(hl.interest_rate) || best.interest_rate;
          best.loan_type = hl.loan_type || best.loan_type;
          best.maturity_date = date(hl.maturity_date) || best.maturity_date;
          best.loan_origination_date = date(hl.loan_origination_date) || best.loan_origination_date;
          best.monthly_payment = num(hl.monthly_payment) || best.monthly_payment;
          best.guarantor_name = hl.guarantor_name || best.guarantor_name;
          best.next_payment_date = date(hl.next_payment_date) || best.next_payment_date;
          best.per_diem = num(hl.per_diem) || best.per_diem;
          best.interest_paid_to_date = num(hl.interest_paid_to_date) || best.interest_paid_to_date;
          best.payments = hl.payments || [];
          best.payment_history_urls.push(paymentHistoryUrls[i]);
        } else {
          const key = normalize(hl.borrower_name || '') + normalize(hl.property_address || '') + normalize(hl.loan_id || '') + '_history';
          if (!key || key === '_history') return;
          loanMap[key] = {
            borrower_name: hl.borrower_name || null,
            property_address: hl.property_address || null,
            original_loan_amount: num(hl.original_loan_amount),
            interest_rate: num(hl.interest_rate),
            loan_type: hl.loan_type || null,
            maturity_date: date(hl.maturity_date),
            loan_origination_date: date(hl.loan_origination_date),
            monthly_payment: num(hl.monthly_payment),
            guarantor_name: hl.guarantor_name || null,
            loan_id: hl.loan_id || null,
            current_principal_balance: num(hl.current_principal_balance),
            next_payment_date: date(hl.next_payment_date),
            per_diem: num(hl.per_diem),
            interest_paid_to_date: num(hl.interest_paid_to_date),
            closing_doc_urls: [],
            servicer_statement_urls: [],
            payment_history_urls: [paymentHistoryUrls[i]],
            payments: hl.payments || [],
          };
        }
      });
    });

    const dedupedLoans = Object.values(loanMap).reduce((loans, loan) => {
      const matchIndex = loans.findIndex(existing => matchScore(existing, loan) >= 0.5);
      if (matchIndex === -1) return [...loans, loan];

      const existing = loans[matchIndex];
      const primary = populatedFieldCount(existing) >= populatedFieldCount(loan) ? existing : loan;
      const duplicate = primary === existing ? loan : existing;
      loans[matchIndex] = mergeLoanRecords(primary, duplicate);
      return loans;
    }, []);

    const loans = dedupedLoans.map((loan, idx) => {
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
