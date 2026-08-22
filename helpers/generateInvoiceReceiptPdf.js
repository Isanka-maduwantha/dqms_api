// F-7.1: renders an itemized invoice/receipt to PDF (same puppeteer approach as
// helpers/generateAppointmentSlipPdf.js).
const puppeteer = require('puppeteer');

// @ts-ignore
exports.generateInvoiceReceiptPdf = async (invoice) => {
    let browser;
    try {
        const { _id, patientId, items, subtotal, taxRate, taxAmount, discount, totalAmount, amountPaid, balanceDue, status, issuedDate } = invoice;

        const rows = items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">${item.unitPrice.toFixed(2)}</td>
                <td style="text-align:right;">${item.amount.toFixed(2)}</td>
            </tr>`).join('');

        const htmlFile = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice Receipt</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { padding: 24px; color: #0f172a; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .muted { color: #64748b; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 6px 4px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    th { text-align: left; color: #64748b; text-transform: uppercase; font-size: 10px; }
    .totals { margin-top: 12px; width: 60%; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 6px; }
    .status { display:inline-block; margin-top:10px; padding:4px 10px; border-radius: 999px; font-size: 11px; font-weight:600; background:#f1f5f9; }
  </style>
</head>
<body>
  <h1>Invoice Receipt</h1>
  <div class="muted">Invoice ID: ${_id}</div>
  <div class="muted">Patient ID: ${patientId}</div>
  <div class="muted">Issued: ${new Date(issuedDate).toLocaleString()}</div>
  <span class="status">${status}</span>

  <table>
    <thead>
      <tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
    <div><span>Tax (${taxRate}%)</span><span>${taxAmount.toFixed(2)}</span></div>
    <div><span>Discount</span><span>-${discount.toFixed(2)}</span></div>
    <div class="grand"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
    <div><span>Paid</span><span>${amountPaid.toFixed(2)}</span></div>
    <div><span>Balance Due</span><span>${balanceDue.toFixed(2)}</span></div>
  </div>
</body>
</html>`;

        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        // @ts-ignore
        await page.setContent(htmlFile, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdfBuffer = await page.pdf({
            format: 'A5',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        return {
            contentType: 'application/pdf',
            setHeader: 'Content-Disposition',
            attachment: `attachment; filename=Receipt-${_id}.pdf`,
            pdf: pdfBuffer
        };
    } catch (error) {
        console.log(error);
    } finally {
        if (browser) await browser.close();
    }
};
