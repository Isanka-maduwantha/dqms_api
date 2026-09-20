const puppeteer = require('puppeteer');
// @ts-ignore
exports.generateAppointmentSlipPdf = async (appointment) => {
    let browser;
    try {
        const { _id, patientId, appointmentDate, appointmentPeriod, appointmentNumber, startTime, endTime } = appointment;

const htmlFile = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Details - Print / PDF</title>
  <style>
    /* Reset & Base Styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background-color: #f7fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 10px;
    }

    /* Optimized for your custom 80mm small slip */
    .card {
      background-color: #ffffff;
      width: 100%;
      max-width: 320px; /* Snug width for small displays/slips */
      padding: 20px 16px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #edf2f7;
    }

    /* Modern Centered Header Profile */
    .header {
      text-align: center;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 2px dashed #e2e8f0; /* Aesthetic ticket notch separator */
    }

    /* Minimalist Logo Icon Placeholder */
    .header .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background-color: #f1f5f9;
      color: #0f172a;
      border-radius: 50%;
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
    }

    .header h2 {
      color: #0f172a;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    
    .header p {
      color: #64748b;
      font-size: 11px;
      margin-top: 2px;
    }

    /* Vertical Data Stack (Much better for hand-sized narrow slips) */
    .data-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 0;
    }

    .label {
      font-weight: 500;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      color: #0f172a;
      font-weight: 600;
      font-size: 13px;
      word-break: break-all;
    }
    
    /* Highlighted time block for quick reading */
    .time-highlight {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 8px;
      margin-top: 6px;
      border: 1px solid #f1f5f9;
    }

    /* Rules applied specifically when rendering as PDF or printing */
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }

      .card {
        box-shadow: none;
        border: none;
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="header">
      <div class="icon">✓</div>
      <h2>Appointment Slip</h2>
      <p>Please keep this for your records</p>
    </div>

    <div class="data-row">
      <span class="label">Appointment Number</span>
      <span class="value">${appointmentNumber ?? '-'}</span>
    </div>

    <div class="data-row">
      <span class="label">Time Period</span>
      <span class="value">${appointmentPeriod || '-'}</span>
    </div>

    <div class="data-row">
      <span class="label">Visit Purpose</span>
      <span class="value">Selected by reception at check-in</span>
    </div>

    <div class="data-row">
      <span class="label">Appointment ID</span>
      <span class="value" style="color: #2563eb;">${_id}</span>
    </div>

    <div class="data-row">
      <span class="label">Patient ID</span>
      <span class="value">${patientId}</span>
    </div>

    <div class="data-row">
      <span class="label">Date</span>
      <span class="value">${appointmentDate}</span>
    </div>

    <div class="time-highlight">
      <div class="data-row" style="padding: 2px 0;">
        <span class="label">Start Time</span>
        <span class="value">${startTime}</span>
      </div>

      <div class="data-row" style="padding: 2px 0;">
        <span class="label">End Time</span>
        <span class="value">${endTime}</span>
      </div>
    </div>

  </div>

</body>
</html>
`;
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage();
        // @ts-ignore
        await page.setContent(htmlFile, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

   const pdfBuffer = await page.pdf({
    // 1. Set custom hand-held dimensions (approx. 80mm width, 150mm height)
    width: '80mm',
    height: '150mm', 
    printBackground: true,
    displayHeaderFooter: true,
    // 2. Reduce font sizes and paddings to fit the small width
    headerTemplate: '<div style="font-size: 6pt; width: 100%; text-align: center; color: #a0aec0; font-family: sans-serif;">CONFIDENTIAL DOCUMENT</div>',
    footerTemplate: '<div style="font-size: 6pt; width: 100%; text-align: center; color: #a0aec0; font-family: sans-serif;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    // 3. Shrink top/bottom margins so they do not consume the small page height
    margin: { 
        top: '12mm', 
        bottom: '12mm', 
        left: '5mm', 
        right: '5mm' 
    }
});

        return {
            contentType: "application/pdf",
            setHeader: "Content-Disposition",
            attachment: `attachment; filename=Invoice-${_id}.pdf`,
            pdf: pdfBuffer
        };

    } catch (error) {

    }
}