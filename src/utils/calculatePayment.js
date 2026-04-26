/**
 * calculatePayment.js
 * Pure math function — no UI, no Supabase calls.
 * Called by PaymentTest.js (manual testing) and eventually the Stripe webhook.
 *
 * Supports: interest_only, amortizing
 * Future: partial_amortization, interest_reserve, pik, step_rate
 *
 * Partial payment logic:
 *   - Payment >= full amount owed → normal flow, dates roll forward
 *   - Payment < interest owed → unpaid interest added to principal (negative amortization),
 *     next payment date does NOT roll forward, status flips to Late
 */

export function calculatePayment(loan, paymentDate, paymentAmount = null) {
  const {
    loan_type,
    principal_balance,
    interest_rate,
    monthly_payment,
    total_interest_paid,
    total_payments_made,
    last_payment_date,
    next_payment_date,
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
  const daysToMaturity = Math.round((matDate - initDate) / msPerDay);
  const isBalloon = daysToMaturity <= 30;

  // ── 4. Calculate full amounts owed ───────────────────────────────────────────
  let interestOwed = 0;
  let principalOwed = 0;
  let expectedPayment = 0;

  if (loan_type === 'interest_only') {
    interestOwed = parseFloat((effectivePerDiem * daysElapsed).toFixed(2));
    principalOwed = isBalloon ? parseFloat(principal_balance.toFixed(2)) : 0;
    expectedPayment = parseFloat((interestOwed + principalOwed).toFixed(2));

  } else if (loan_type === 'amortizing') {
    interestOwed = parseFloat(((principal_balance * (interest_rate / 100)) / 12).toFixed(2));
    principalOwed = parseFloat((monthly_payment - interestOwed).toFixed(2));
    if (isBalloon) principalOwed = parseFloat(principal_balance.toFixed(2));
    expectedPayment = parseFloat((interestOwed + principalOwed).toFixed(2));

  } else {
    return { error: `Loan type "${loan_type}" is not yet supported in calculatePayment.` };
  }

  // ── 5. Actual payment amount ─────────────────────────────────────────────────
  const actualPayment = paymentAmount !== null
    ? parseFloat(parseFloat(paymentAmount).toFixed(2))
    : expectedPayment;

  // ── 6. Partial payment detection ─────────────────────────────────────────────
  const isPartial = actualPayment < expectedPayment;

  // How much of the actual payment went to interest vs principal
  let interestPortion = 0;
  let principalPortion = 0;

  if (!isPartial) {
    // Full or overpayment — normal split
    interestPortion = interestOwed;
    principalPortion = principalOwed;
  } else if (actualPayment <= interestOwed) {
    // Partial — doesn't even cover full interest
    interestPortion = actualPayment;
    principalPortion = 0;
  } else {
    // Partial — covers interest but not all principal
    interestPortion = interestOwed;
    principalPortion = parseFloat((actualPayment - interestOwed).toFixed(2));
  }

  // Unpaid interest gets added to principal (negative amortization)
  const unpaidInterest = parseFloat(Math.max(0, interestOwed - interestPortion).toFixed(2));

  // ── 7. New balances ──────────────────────────────────────────────────────────
  const newPrincipalBalance = parseFloat(
    Math.max(0, principal_balance - principalPortion + unpaidInterest).toFixed(2)
  );
  const newTotalInterestPaid = parseFloat((total_interest_paid + interestPortion).toFixed(2));
  const newTotalPaymentsMade = total_payments_made + 1;

  // ── 8. Next payment date ─────────────────────────────────────────────────────
  // Partial: keep existing next_payment_date — borrower still delinquent
  // Full: roll forward 1 month from initiation date
  let nextPaymentDateStr;
  if (isPartial) {
    nextPaymentDateStr = next_payment_date || paymentDate;
  } else {
    const nextDate = new Date(initDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextPaymentDateStr = nextDate.toISOString().split('T')[0];
  }

  // ── 9. Status update ─────────────────────────────────────────────────────────
  const isPaidOff = newPrincipalBalance === 0 && (isBalloon || loan_type === 'amortizing');
  let newPaymentStatus;
  let newStatus;

  if (isPaidOff) {
    newPaymentStatus = 'Paid Off';
    newStatus = 'paid_off';
  } else if (isPartial) {
    newPaymentStatus = 'Late';
    newStatus = 'active';
  } else {
    newPaymentStatus = 'Current';
    newStatus = 'active';
  }

  // ── 10. Return full breakdown + Supabase fields ──────────────────────────────
  return {
    breakdown: {
      daysElapsed,
      effectivePerDiem,
      interestOwed,
      principalOwed,
      interestPortion,
      principalPortion,
      expectedPayment,
      actualPayment,
      unpaidInterest,
      isPartial,
      isBalloon,
      isPaidOff,
      daysToMaturity,
    },
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
