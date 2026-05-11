import { preparePostRequest } from './lib/http.js';
import { generateInvoicePDF } from './lib/submit-pdfs.js';

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { invoice = {}, lender = {} } = req.body || {};
    const servicingItems = invoice.servicing || Array.from({ length: invoice.servicingCount || 0 }, (_, index) => ({
      details: `Loan servicing - loan ${index + 1}`,
      amount: 35,
    }));
    const additionalItems = invoice.additional || Array.from({ length: invoice.payoffCount || 0 }, (_, index) => ({
      details: `Payoff statement - item ${index + 1}`,
      amount: 30,
    }));
    const pdf = await generateInvoicePDF({
      invoiceNumber: invoice.number || `INV-${invoice.year}-${String(invoice.month || 'invoice').toUpperCase()}`,
      invoiceDate: invoice.invoiceDate || '06/01/2026',
      dueDate: invoice.dueDate || '06/01/2026',
      billingPeriod: invoice.billingPeriod || `Billing period: ${invoice.month || 'May'} 1 - ${invoice.month || 'May'} 31, ${invoice.year || '2026'}`,
      lenderName: lender.company || lender.name || 'SwiftDeed lender',
      contactName: lender.contact || '',
      billingEmail: lender.email || '',
      servicingItems: servicingItems.map(item => ({
        loan: item.details,
        amount: item.amount,
      })),
      additionalItems: additionalItems.map(item => ({
        details: item.details,
        amount: item.amount,
      })),
    });

    const filename = `${invoice.id || 'swiftdeed-invoice'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: error.message || 'Unable to generate invoice' });
  }
}
