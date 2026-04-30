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

export async function assertEmailSent(response, label) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} email failed: ${response.status} ${body}`);
  }
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
        <p style="font-size: 12px; color: #aaa;">SwiftDeed LLC · www.theswiftdeed.com</p>
      </div>
    `,
    TextBody: `${greeting ? greeting + '\n\n' : ''}Your loan is now being serviced by SwiftDeed.\n\nYOUR LOAN ID: ${internalLoanId}\nKeep this safe — you'll need it to verify your identity when activating your portal.\n\nActivate your borrower portal here: ${activationUrl}\n\nIf you have any questions, reply to this email or contact your lender directly.\n\nSwiftDeed LLC`,
  }, 'Borrower activation');
}
