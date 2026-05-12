import Anthropic from '@anthropic-ai/sdk';
import { preparePostRequest } from './lib/http.js';
import { supabase } from './lib/supabase.js';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const prompt = `Extract loan terms from these documents. Return ONLY raw JSON.
Fields:
borrower_name, property_address, unpaid_principal, interest_rate, loan_type,
loan_origination_date, maturity_date, next_payment_due_date, monthly_payment,
daily_interest, accrual_basis, guarantor_name.
Use numbers only for money/rates. Use dates as MM/DD/YYYY.
If the table shows Loan Type as Interest Only, return exactly "Interest Only".
If there is a Close Date or main date under the loan number, return it as loan_origination_date.
Always extract Guarantor(s) when present.`;

function merge(rows) {
  const out = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row || {})) {
      if (value !== null && value !== undefined && value !== '' && !out[key]) out[key] = value;
    }
  }
  return out;
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function date(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function location(address = '') {
  const match = String(address).match(/,\s*([^,]+),\s*([A-Z]{2})(?:\s+\d{5})?\s*$/i);
  return { city: match?.[1]?.trim() || null, state: match?.[2]?.toUpperCase() || null };
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { loanIdInternal, newDocUrls } = req.body || {};
    if (!loanIdInternal || !Array.isArray(newDocUrls)) return res.status(400).json({ error: 'Missing required fields' });

    if (newDocUrls.length === 0) {
      const clear = { interest_rate: null, per_diem: null, monthly_payment: null, next_payment_date: null, maturity_date: null, loan_type: null, loan_document_urls: '' };
      await supabase.from('borrowers').update({ ...clear, principal_balance: null, original_loan_amount: null }).eq('loan_id_internal', loanIdInternal);
      await supabase.from('payoff_requests').update({ ...clear, total_due: null }).eq('loan_id_internal', loanIdInternal);
      return res.status(200).json({ success: true, borrower: null, request: null });
    }

    const extractedRows = [];
    for (const url of newDocUrls) {
      const pdf = await fetch(url);
      if (!pdf.ok) continue;
      const data = Buffer.from(await pdf.arrayBuffer()).toString('base64');
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: prompt },
        ] }],
      });
      const raw = response.content?.[0]?.text || '{}';
      const json = raw.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      try { extractedRows.push(JSON.parse(json)); } catch {}
    }

    const data = merge(extractedRows);
    const principal = num(data.unpaid_principal);
    const rate = num(data.interest_rate);
    const loanType = data.loan_type || null;
    const monthlyPayment = num(data.monthly_payment) || (loanType && String(loanType).toLowerCase().includes('interest') && principal && rate ? Number(((principal * (rate / 100)) / 12).toFixed(2)) : null);
    const perDiem = num(data.daily_interest) || (principal && rate ? Number(((principal * (rate / 100)) / 365).toFixed(2)) : null);
    const loc = location(data.property_address);
    const docUrlValue = newDocUrls.join(',');

    const borrowerPatch = clean({
      legal_name: data.borrower_name,
      property_address: data.property_address,
      guarantor_name: data.guarantor_name,
      city: loc.city,
      state: loc.state,
      principal_balance: principal,
      original_loan_amount: principal,
      interest_rate: rate,
      per_diem: perDiem,
      monthly_payment: monthlyPayment,
      loan_type: loanType,
      loan_start_date: date(data.loan_origination_date),
      maturity_date: date(data.maturity_date),
      next_payment_date: date(data.next_payment_due_date),
      loan_document_urls: docUrlValue,
    });

    const requestPatch = clean({
      borrower_name: data.borrower_name,
      property_address: data.property_address,
      total_due: principal,
      interest_rate: rate,
      per_diem: perDiem,
      monthly_payment: monthlyPayment,
      loan_type: loanType,
      maturity_date: date(data.maturity_date),
      next_payment_date: date(data.next_payment_due_date),
      loan_document_urls: docUrlValue,
    });

    const { data: borrowerRows, error: borrowerError } = await supabase.from('borrowers').update(borrowerPatch).eq('loan_id_internal', loanIdInternal).select();
    if (borrowerError) throw borrowerError;
    const { data: requestRows, error: requestError } = await supabase.from('payoff_requests').update(requestPatch).eq('loan_id_internal', loanIdInternal).select();
    if (requestError) throw requestError;

    return res.status(200).json({ success: true, borrower: borrowerRows?.[0] || null, request: requestRows?.[0] || null });
  } catch (error) {
    console.error('Reprocess loan docs error:', error);
    return res.status(500).json({ error: error.message });
  }
}
