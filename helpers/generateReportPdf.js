const puppeteer = require('puppeteer');

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  return `LKR ${Number(
    value || 0
  ).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toISOString()
    .replace('T', ' ')
    .slice(0, 19);
}

function renderSummary(summary) {
  if (!summary) {
    return '';
  }

  const entries = [];

  for (const [key, value] of Object.entries(
    summary
  )) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      for (
        const [nestedKey, nestedValue]
        of Object.entries(value)
      ) {
        entries.push({
          key:
            `${key} - ${nestedKey}`,
          value:
            typeof nestedValue === 'object'
              ? JSON.stringify(
                  nestedValue
                )
              : nestedValue,
        });
      }
    } else {
      entries.push({
        key,
        value:
          Array.isArray(value)
            ? value.join(', ')
            : value,
      });
    }
  }

  return `
    <div class="summary-grid">
      ${entries
        .map(
          (entry) => `
            <div class="summary-card">
              <div class="summary-label">
                ${escapeHtml(
                  entry.key
                )}
              </div>
              <div class="summary-value">
                ${escapeHtml(
                  entry.value
                )}
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderInventory(report) {
  const items =
    report.data.items || [];

  return `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Reorder</th>
          <th>Unit Price</th>
          <th>Stock Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const status = [];

            if (!item.isActive) {
              status.push('INACTIVE');
            }

            if (
              item.isActive &&
              item.isLowStock
            ) {
              status.push('LOW STOCK');
            }

            if (
              item.isActive &&
              item.isExpired
            ) {
              status.push('EXPIRED');
            }

            if (status.length === 0) {
              status.push('OK');
            }

            return `
              <tr>
                <td>${escapeHtml(
                  item.itemName
                )}</td>
                <td>${escapeHtml(
                  item.category
                )}</td>
                <td>${escapeHtml(
                  item.quantity
                )}</td>
                <td>${escapeHtml(
                  item.unit
                )}</td>
                <td>${escapeHtml(
                  item.reorderThreshold
                )}</td>
                <td>${formatMoney(
                  item.unitPrice
                )}</td>
                <td>${formatMoney(
                  item.stockValue
                )}</td>
                <td>${escapeHtml(
                  status.join(', ')
                )}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function renderTreatments(report) {
  const records =
    report.data.records || [];

  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Patient</th>
          <th>Treatment</th>
          <th>Price</th>
          <th>Dentist</th>
          <th>Diagnosis</th>
          <th>Appointment</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .map(
            (record) => `
              <tr>
                <td>${formatDate(
                  record.treatmentDate
                )}</td>
                <td>
                  ${escapeHtml(
                    record.patient?.name ||
                      '-'
                  )}
                  <br>
                  <small>
                    ${escapeHtml(
                      record.patient?.nic ||
                        ''
                    )}
                  </small>
                </td>
                <td>
                  ${escapeHtml(
                    record.treatmentTypeName ||
                      record.treatmentType?.name ||
                      record.treatment ||
                      '-'
                  )}
                </td>
                <td>${formatMoney(
                  record.treatmentPrice
                )}</td>
                <td>${escapeHtml(
                  record.dentist?.name ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  record.diagnosis ||
                    '-'
                )}</td>
                <td>
                  ${escapeHtml(
                    record.appointment
                      ?.appointmentDate ||
                      '-'
                  )}
                  <br>
                  ${escapeHtml(
                    record.appointment
                      ?.startTime ||
                      ''
                  )}
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderRevenue(report) {
  const invoices =
    report.data.invoices || [];

  return `
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Date</th>
          <th>Patient</th>
          <th>Treatment</th>
          <th>Total</th>
          <th>Paid</th>
          <th>Outstanding</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${invoices
          .map(
            (invoice) => `
              <tr>
                <td>${escapeHtml(
                  invoice.invoiceNumber
                )}</td>
                <td>${formatDate(
                  invoice.issuedDate
                )}</td>
                <td>${escapeHtml(
                  invoice.patientId?.name ||
                    invoice.patientSnapshot?.name ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  invoice.treatmentName
                )}</td>
                <td>${formatMoney(
                  invoice.totalAmount
                )}</td>
                <td>${formatMoney(
                  invoice.amountPaid
                )}</td>
                <td>${formatMoney(
                  invoice.outstandingBalance
                )}</td>
                <td>${escapeHtml(
                  invoice.status
                )}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderPayments(report) {
  const payments =
    report.data.payments || [];

  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Invoice</th>
          <th>Patient</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Installment</th>
          <th>Received By</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${payments
          .map(
            (payment) => `
              <tr>
                <td>${formatDateTime(
                  payment.paymentDate
                )}</td>
                <td>${escapeHtml(
                  payment.invoiceId
                    ?.invoiceNumber ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  payment.patientId?.name ||
                    '-'
                )}</td>
                <td>${formatMoney(
                  payment.amount
                )}</td>
                <td>${escapeHtml(
                  payment.method
                )}</td>
                <td>${payment.isInstallment
                  ? 'YES'
                  : 'NO'}</td>
                <td>${escapeHtml(
                  payment.receivedBy
                    ?.name ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  payment.notes ||
                    '-'
                )}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAppointments(report) {
  const appointments =
    report.data.appointments ||
    [];

  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Patient</th>
          <th>Dentist</th>
          <th>Purpose</th>
          <th>Type</th>
          <th>Token</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${appointments
          .map(
            (appointment) => `
              <tr>
                <td>${escapeHtml(
                  appointment.appointmentDate
                )}</td>
                <td>
                  ${escapeHtml(
                    appointment.startTime
                  )}
                  -
                  ${escapeHtml(
                    appointment.endTime
                  )}
                </td>
                <td>${escapeHtml(
                  appointment.patientId
                    ?.name ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  appointment.doctorId
                    ?.name ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  appointment.visitPurpose ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  appointment.type ||
                    '-'
                )}</td>
                <td>${escapeHtml(
                  appointment.tokenNumber ??
                    '-'
                )}</td>
                <td>${escapeHtml(
                  appointment.status
                )}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderReportData(report) {
  switch (
    report.reportType
  ) {
    case 'INVENTORY':
      return renderInventory(
        report
      );

    case 'PATIENT_TREATMENTS':
    case 'ALL_TREATMENTS':
      return renderTreatments(
        report
      );

    case 'REVENUE':
      return renderRevenue(
        report
      );

    case 'PATIENT_PAYMENTS':
    case 'ALL_PAYMENTS':
      return renderPayments(
        report
      );

    case 'APPOINTMENTS':
      return renderAppointments(
        report
      );

    default:
      return `
        <p>
          No PDF renderer is available
          for this report type.
        </p>
      `;
  }
}

async function generateReportPdf({
  report,
  reportId,
}) {
  let browser;

  try {
    browser =
      await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

    const page =
      await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">

          <style>
            @page {
              size: A4 landscape;
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #16352b;
              font-size: 10px;
              margin: 0;
            }

            .header {
              border-bottom: 3px solid #1f8f5f;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }

            .clinic-name {
              font-size: 22px;
              font-weight: bold;
              color: #157347;
              letter-spacing: 0.2px;
            }

            .report-title {
              font-size: 16px;
              font-weight: 600;
              color: #16352b;
              margin-top: 5px;
            }

            .metadata {
              margin-top: 8px;
              color: #4b6359;
            }

            .summary-grid {
              display: grid;
              grid-template-columns:
                repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 15px;
            }

            .summary-card {
              border: 1px solid #b9ddcc;
              border-left: 4px solid #1f8f5f;
              background: #f4fbf7;
              padding: 8px;
              border-radius: 8px;
              min-height: 55px;
            }

            .summary-label {
              color: #527064;
              font-size: 8px;
              text-transform: uppercase;
            }

            .summary-value {
              font-size: 12px;
              font-weight: bold;
              margin-top: 5px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th {
              background: #1f8f5f;
              color: #ffffff;
              font-weight: bold;
            }

            th,
            td {
              border: 1px solid #b9ddcc;
              padding: 5px;
              text-align: left;
              vertical-align: top;
            }

            tbody tr:nth-child(even) {
              background: #f8fcfa;
            }

            tr {
              page-break-inside: avoid;
            }

            small {
              color: #527064;
            }

            .footer {
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px solid #ccc;
              color: #527064;
              font-size: 8px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="clinic-name">
              Dental Clinic
            </div>

            <div class="report-title">
              ${escapeHtml(
                report.title
              )}
            </div>

            <div class="metadata">
              Report ID:
              ${escapeHtml(
                reportId
              )}
              <br>
              Generated:
              ${escapeHtml(
                formatDateTime(
                  new Date()
                )
              )}
            </div>
          </div>

          ${renderSummary(
            report.summary
          )}

          ${renderReportData(
            report
          )}

          <div class="footer">
            Dental Clinic -
            Administrative Report
          </div>
        </body>
      </html>
    `;

    await page.setContent(
      html,
      {
        waitUntil:
          'networkidle0',
      }
    );

    return await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateReportPdf,
};
