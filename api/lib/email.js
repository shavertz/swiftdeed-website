export async function sendPostmarkEmail(payload, label) {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} email failed: ${response.status} ${body}`);
  }
}

export async function sendLenderPayoffEmail({
  lenderEmail,
  lenderName,
  borrowerName,
  totalDue,
  internalLoanId,
  pdfBuffer,
  invoiceBuffer,
}) {
  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: lenderEmail,
    Subject: `Payoff Statement - ${borrowerName || 'Your Loan'}`,
    TextBody: `Hi ${lenderName},\n\nYour payoff statement is ready. Please see the attached PDFs.\n\nTotal payoff amount: $${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}\nReference ID: ${internalLoanId}\n\nThank you,\nSwiftDeed`,
    HtmlBody: `<p>Hi ${lenderName},</p><p>Your payoff statement is ready. Please see the attached PDFs.</p><p><strong>Total payoff amount:</strong> $${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}<br><strong>Reference ID:</strong> ${internalLoanId}</p><p>Thank you,<br>SwiftDeed</p>`,
    Attachments: [{
      Name: `${internalLoanId}_payoff-statement.pdf`,
      Content: pdfBuffer.toString('base64'),
      ContentType: 'application/pdf',
    }, {
      Name: `${internalLoanId}_invoice.pdf`,
      Content: invoiceBuffer.toString('base64'),
      ContentType: 'application/pdf',
    }],
  }, 'Lender payoff');
}

export async function sendInternalSubmissionEmail({
  name,
  email,
  company,
  phone,
  borrowerId,
  turnaround,
  notes,
  internalLoanId,
  loanData,
  fileCount,
}) {
  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: 'requests@theswiftdeed.com',
    Subject: `New web submission - ${name} (${company})`,
    TextBody: `New payoff request from the website.\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\nPhone: ${phone}\nBorrower ID: ${borrowerId || 'Not provided'}\nTurnaround: ${turnaround}\nNotes: ${notes || 'None'}\n\nInternal ID: ${internalLoanId}\nInterest method: ${loanData.interest_calculation_method || 'not stated'}\nAccrual basis: ${loanData.accrual_basis || 'not stated (defaulted to Actual/365)'}\nCompounding: ${loanData.compounding_frequency || 'none detected'}\nDocuments: ${fileCount} file(s) uploaded`,
  }, 'Internal notification');
}

export async function sendLenderDocsUpdatedEmail({
  lenderEmail,
  lenderName,
  loanIdInternal,
  documentCount,
  docsAdded,
}) {
  if (!lenderEmail) return;

  const actionText = docsAdded ? 'New documents were added' : 'Loan documents were updated';

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: lenderEmail,
    Subject: `Loan documents updated - ${loanIdInternal}`,
    HtmlBody: `<p>Hi ${lenderName || 'there'},</p><p>${actionText} for <strong>${loanIdInternal}</strong>. There ${documentCount === 1 ? 'is' : 'are'} now <strong>${documentCount}</strong> document${documentCount !== 1 ? 's' : ''} on file.</p><p>- SwiftDeed</p>`,
    TextBody: `${actionText} for ${loanIdInternal}. ${documentCount} document(s) on file.`,
    MessageStream: 'outbound',
  }, 'Lender document update');
}

export async function sendBorrowerDocsAddedEmail({
  borrowerEmail,
  borrowerName,
}) {
  if (!borrowerEmail) return;

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: borrowerEmail,
    Subject: 'New document added to your loan',
    HtmlBody: `<p>Hi ${borrowerName || 'there'},</p><p>A new document has been added to your loan. You can view and download it anytime from your borrower portal.</p><p>- SwiftDeed</p>`,
    TextBody: 'A new document has been added to your loan. Log into your borrower portal to view it.',
    MessageStream: 'outbound',
  }, 'Borrower document update');
}

export async function sendLenderLoanDeletedEmail({
  lenderEmail,
  lenderName,
  loanIdInternal,
  borrowerName,
  propertyAddress,
}) {
  if (!lenderEmail) return;

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: lenderEmail,
    Subject: `Loan deleted - ${loanIdInternal}`,
    HtmlBody: `<p>Hi ${lenderName || 'there'},</p><p>The loan <strong>${loanIdInternal}</strong> for borrower <strong>${borrowerName || 'not provided'}</strong> at <strong>${propertyAddress || 'not provided'}</strong> has been permanently deleted from SwiftDeed. The borrower's portal access has been removed.</p><p>If this was a mistake, please resubmit the loan through the portal.</p><p>- SwiftDeed</p>`,
    TextBody: `Loan ${loanIdInternal} for ${borrowerName || 'not provided'} has been permanently deleted. The borrower's portal access has been removed.`,
    MessageStream: 'outbound',
  }, 'Lender loan delete');
}

export async function sendBorrowerPaymentReceiptEmail({
  borrowerEmail,
  borrowerName,
  loanIdInternal,
  amount,
  pdfBuffer,
}) {
  if (!borrowerEmail) return;

  const formattedAmount = parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: borrowerEmail,
    Subject: `Payment Receipt - ${loanIdInternal}`,
    HtmlBody: `<p>Hi ${borrowerName || 'there'},</p><p>Your payment of <strong>$${formattedAmount}</strong> has been received for loan <strong>${loanIdInternal}</strong>.</p><p>Please find your payment receipt attached.</p><p>Thank you,<br>SwiftDeed LLC</p>`,
    TextBody: `Hi ${borrowerName || 'there'},\n\nYour payment of $${formattedAmount} has been received for loan ${loanIdInternal}.\n\nPlease find your payment receipt attached.\n\nThank you,\nSwiftDeed LLC`,
    Attachments: [{
      Name: `${loanIdInternal}-payment-receipt.pdf`,
      Content: pdfBuffer.toString('base64'),
      ContentType: 'application/pdf',
    }],
  }, 'Borrower payment receipt');
}

export async function sendLenderPaymentReceivedEmail({
  lenderEmail,
  borrowerName,
  loanIdInternal,
  amount,
  method,
  paymentDate,
  principalBalanceAfter,
}) {
  if (!lenderEmail) return;

  const formattedAmount = parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const formattedBalance = parseFloat(principalBalanceAfter || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const paymentMethod = method || 'not provided';
  const paidOn = paymentDate || 'not provided';

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: lenderEmail,
    Subject: `Payment Received - ${borrowerName || 'Borrower'} - ${loanIdInternal}`,
    HtmlBody: `<p>A payment of <strong>$${formattedAmount}</strong> has been recorded for borrower <strong>${borrowerName || 'not provided'}</strong> on loan <strong>${loanIdInternal}</strong>.</p><p>Method: ${paymentMethod}<br>Date: ${paidOn}<br>Remaining balance: $${formattedBalance}</p><p>SwiftDeed LLC</p>`,
    TextBody: `Payment recorded for ${borrowerName || 'not provided'} - ${loanIdInternal}\n\nAmount: $${formattedAmount}\nMethod: ${paymentMethod}\nDate: ${paidOn}\nRemaining balance: $${formattedBalance}\n\nSwiftDeed LLC`,
  }, 'Lender payment notification');
}

export async function sendBorrowerActivationEmail({ borrowerEmail, borrowerName, internalLoanId, activationUrl }) {
  const greeting = borrowerName ? `Hi ${borrowerName},` : '';

  await sendPostmarkEmail({
    From: 'scott@theswiftdeed.com',
    To: borrowerEmail,
    Subject: 'Your loan is now being serviced by SwiftDeed',
    HtmlBody: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #111;">
        <div style="font-size: 22px; font-weight: 600; margin-bottom: 6px;">
          Swift<span style="color: #D4A017;">Deed</span>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        ${greeting ? `<p style="font-size: 15px; line-height: 1.6;">${greeting}</p>` : ''}
        <p style="font-size: 15px; line-height: 1.6;">
          Your loan is now being serviced by SwiftDeed. Click the link below to activate your borrower portal.
        </p>
        <p style="font-size: 15px; margin: 24px 0;">
          <strong>Activate your portal:</strong><br/>
          <a href="${activationUrl}" style="color: #D4A017; font-size: 14px; word-break: break-all;">${activationUrl}</a>
        </p>
        <div style="background: #fffbea; border: 1.5px solid #D4A017; border-radius: 8px; padding: 20px 24px; margin: 28px 0;">
          <p style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Loan ID</p>
          <p style="font-size: 28px; font-weight: 700; color: #111; letter-spacing: 1px; margin: 0 0 10px;">${internalLoanId}</p>
          <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">
            <strong>Keep this safe.</strong> You'll need this Loan ID to verify your identity when you activate your portal. Do not share it with anyone.
          </p>
        </div>
        <p style="font-size: 13px; color: #888; line-height: 1.6;">
          If you have any questions, reply to this email or contact your lender directly.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #aaa;">SwiftDeed LLC - www.theswiftdeed.com</p>
      </div>
    `,
    TextBody: `${greeting ? greeting + '\n\n' : ''}Your loan is now being serviced by SwiftDeed.\n\nYOUR LOAN ID: ${internalLoanId}\nKeep this safe - you'll need it to verify your identity when activating your portal.\n\nActivate your borrower portal here: ${activationUrl}\n\nIf you have any questions, reply to this email or contact your lender directly.\n\nSwiftDeed LLC`,
  }, 'Borrower activation');
}
