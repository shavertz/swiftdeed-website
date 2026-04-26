/**
 * calculatePayment.js
 * Pure math function — no UI, no Supabase calls.
 * Called by PaymentTest.js (manual testing) and eventually the Stripe webhook.
 *
 * Supports: interest_only, amortizing
 * Future: partial_amortization, interest_reserve, pik, step_rate
 */

/**
 * Calculate the result of processing a payment on a loan.
 *
 * @param {Object} loan - The borrowers row from Supabase
 * @param {string} paymentDate - ISO date string of when payment was initiated (YYYY-MM-DD)
 * @param {number|null} paymentAmount - Override amount (for balloon/partial). If null, uses monthly_payment.
 * @returns {Object} result - Full breakdown + updated fields to write back to Supabase
 */
export function calculatePayment(loan, paymentDate, paymentAmount = null) {
  const {
    loan_type,
    principal_balance,
    interest_rate,
    per_diem,
    monthly_payment,
    original_loan_amount,
    total_interest_paid,
    total_payments_made,
    last_payment_date,
    maturity_date,
    day_count_convention,
  } = loan;

  // ── 1. Days elapsed since last payment ──────────────────────────────────────
  const lastDate = new Date(last_payment_date);
  const initDate = new Date(paymentDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.round((initDate - lastDate) / msPerDay);

  if (daysElapsed <= 0) {
    return { error: 'Payment date must be after the last payment date.' };
  }

  // ── 2. Effective per diem (respects day_count_convention) ───────────────────
  const convention = parseInt(day_count_convention) || 360;
  const effectivePerDiem = (principal_balance * (interest_rate / 100)) / convention;

  // ── 3. Detect balloon payment (final payment) ───────────────────────────────
  const matDate = new Date(maturity_date);
  const nextMonth = new Date(initDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const daysToMaturity = Math.round((matDate - initDate) / msPerDay);
  const isBalloon = daysToMaturity <= 30;

  // ── 4. Calculate split based on loan type ───────────────────────────────────
  let interestPortion = 0;
  let principalPortion = 0;
  let expectedPayment = 0;

  if (loan_type === 'interest_only') {
    interestPortion = parseFloat((effectivePerDiem * daysElapsed).toFixed(2));
    principalPortion = isBalloon ? parseFloat(principal_balance.toFixed(2)) : 0;
    expectedPayment = parseFloat((interestPortion + principalPortion).toFixed(2));

  } else if (loan_type === 'amortizing') {
    interestPortion = parseFloat(((principal_balance * (interest_rate / 100)) / 12).toFixed(2));
    principalPortion = parseFloat((monthly_payment - interestPortion).toFixed(2));
    // On final payment, pay whatever principal remains
    if (isBalloon) principalPortion = parseFloat(principal_balance.toFixed(2));
    expectedPayment = parseFloat((interestPortion + principalPortion).toFixed(2));

  } else {
    return { error: `Loan type "${loan_type}" is not yet supported in calculatePayment.` };
  }

  // ── 5. Actual payment amount (override for manual/partial) ──────────────────
  const actualPayment = paymentAmount !== null
    ? parseFloat(paymentAmount.toFixed(2))
    : expectedPayment;

  // ── 6. New balances ─────────────────────────────────────────────────────────
  const newPrincipalBalance = parseFloat(Math.max(0, principal_balance - principalPortion).toFixed(2));
  const newTotalInterestPaid = parseFloat((total_interest_paid + interestPortion).toFixed(2));
  const newTotalPaymentsMade = total_payments_made + 1;

  // ── 7. Next payment date (1 month forward from initiation date) ─────────────
  const nextPaymentDate = new Date(initDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  const nextPaymentDateStr = nextPaymentDate.toISOString().split('T')[0];

  // ── 8. Status update ────────────────────────────────────────────────────────
  const isPaidOff = newPrincipalBalance === 0 && (isBalloon || loan_type === 'amortizing');
  const newPaymentStatus = isPaidOff ? 'Paid Off' : 'Current';
  const newStatus = isPaidOff ? 'paid_off' : 'active';

  // ── 9. Return full breakdown + Supabase fields ──────────────────────────────
  return {
    // Human-readable breakdown (for test UI display)
    breakdown: {
      daysElapsed,
      effectivePerDiem,
      interestPortion,
      principalPortion,
      expectedPayment,
      actualPayment,
      isBalloon,
      isPaidOff,
      daysToMaturity,
    },

    // Exact fields to write back to Supabase
    updates: {
      principal_balance: newPrincipalBalance,
      total_interest_paid: newTotalInterestPaid,
      total_payments_made: newTotalPaymentsMade,
      last_payment_date: paymentDate,
      next_payment_date: isPaidOff ? null : nextPaymentDateStr,
      payment_status: newPaymentStatus,
      status: newStatus,
    },
  };
}
