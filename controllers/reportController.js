const mongoose = require('mongoose');

const User = require('../models/user');
const Appointments = require('../models/Appointments');
const DentalChart = require('../models/DentalChart');
const InventoryItem = require('../models/InventoryItem');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Report = require('../models/Report');

const {
  generateReportPdf,
} = require('../helpers/generateReportPdf');

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function parseDateOnly(value) {
  if (!isValidDateString(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function getDateRange({
  period,
  date,
  startDate,
  endDate,
}) {
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error(
        'Both startDate and endDate are required when using a custom date range.'
      );

      error.statusCode = 400;
      throw error;
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
      const error = new Error(
        'startDate and endDate must use YYYY-MM-DD format.'
      );

      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error(
        'startDate cannot be later than endDate.'
      );

      error.statusCode = 400;
      throw error;
    }

    return {
      start,
      endExclusive: addDays(end, 1),
      startDate: formatDateOnly(start),
      endDate: formatDateOnly(end),
    };
  }

  const requestedPeriod =
    String(period || 'day').toLowerCase();

  const baseDate =
    parseDateOnly(date) ||
    new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )
    );

  if (date && !parseDateOnly(date)) {
    const error = new Error(
      'date must use YYYY-MM-DD format.'
    );

    error.statusCode = 400;
    throw error;
  }

  if (requestedPeriod === 'day') {
    return {
      start: baseDate,
      endExclusive: addDays(baseDate, 1),
      startDate: formatDateOnly(baseDate),
      endDate: formatDateOnly(baseDate),
    };
  }

  if (requestedPeriod === 'week') {
    const dayOfWeek = baseDate.getUTCDay();

    const daysSinceMonday =
      dayOfWeek === 0
        ? 6
        : dayOfWeek - 1;

    const start = addDays(
      baseDate,
      -daysSinceMonday
    );

    const end = addDays(start, 6);

    return {
      start,
      endExclusive: addDays(end, 1),
      startDate: formatDateOnly(start),
      endDate: formatDateOnly(end),
    };
  }

  if (requestedPeriod === 'month') {
    const start = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        1
      )
    );

    const end = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth() + 1,
        0
      )
    );

    return {
      start,
      endExclusive: addDays(end, 1),
      startDate: formatDateOnly(start),
      endDate: formatDateOnly(end),
    };
  }

  const error = new Error(
    'Invalid period. Use day, week, or month.'
  );

  error.statusCode = 400;
  throw error;
}

function getDateRangeFromQuery(req) {
  return getDateRange({
    period: req.query.period,
    date: req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
}

function toNumber(value) {
  return Number(value || 0);
}

async function saveReportRecord({
  reportType,
  generatedBy,
  filters,
  summary,
}) {
  return Report.create({
    reportType,
    generatedBy,
    generatedAt: new Date(),
    filters,
    summary,
  });
}

async function findPatient(patientId) {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    const error = new Error(
      'Invalid patient ID.'
    );

    error.statusCode = 400;
    throw error;
  }

  const patient = await User.findOne({
    _id: patientId,
    role: 'patient',
  })
    .select('_id name nic phone email')
    .lean();

  if (!patient) {
    const error = new Error(
      'Patient not found.'
    );

    error.statusCode = 404;
    throw error;
  }

  return patient;
}

async function buildInventoryReport() {
  const items = await InventoryItem.find({})
    .sort({
      category: 1,
      itemName: 1,
    })
    .lean();

  const now = new Date();

  const formattedItems = items.map((item) => {
    const isLowStock =
      item.quantity <= item.reorderThreshold;

    const isExpired =
      item.expiryDate &&
      new Date(item.expiryDate) < now;

    const stockValue =
      toNumber(item.quantity) *
      toNumber(item.unitPrice);

    return {
      id: item._id,
      itemName: item.itemName,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      reorderThreshold: item.reorderThreshold,
      unitPrice: item.unitPrice,
      stockValue,
      expiryDate: item.expiryDate,
      isActive: item.isActive,
      isLowStock,
      isExpired: Boolean(isExpired),
    };
  });

  const activeItems =
    formattedItems.filter(
      (item) => item.isActive
    );

  const lowStockItems =
    formattedItems.filter(
      (item) =>
        item.isActive &&
        item.isLowStock
    );

  const expiredItems =
    formattedItems.filter(
      (item) =>
        item.isActive &&
        item.isExpired
    );

  const totalStockValue =
    formattedItems.reduce(
      (total, item) =>
        total + item.stockValue,
      0
    );

  const summary = {
    totalItems: formattedItems.length,
    activeItems: activeItems.length,
    inactiveItems:
      formattedItems.length -
      activeItems.length,
    lowStockItems:
      lowStockItems.length,
    expiredItems:
      expiredItems.length,
    totalStockValue,
  };

  return {
    reportType: 'INVENTORY',
    title: 'Current Inventory Report',
    filters: {},
    summary,
    data: {
      items: formattedItems,
    },
  };
}

async function buildTreatmentReport(req) {
  const { patientId } = req.query;

  if (patientId) {
    await findPatient(patientId);
  }

  const query = patientId
    ? { patientId }
    : {};

  const charts = await DentalChart.find(query)
    .populate(
      'patientId',
      'name nic phone email'
    )
    .populate(
      'treatmentRecords.dentistId',
      'name email role'
    )
    .populate(
      'treatmentRecords.appointmentId',
      'appointmentDate startTime endTime type visitPurpose status tokenNumber'
    )
    .populate(
      'treatmentRecords.treatmentTypeId',
      'code name category price'
    )
    .lean();

  const records = [];

  for (const chart of charts) {
    const patient =
      chart.patientId || null;

    for (const record of
      chart.treatmentRecords || []) {
      records.push({
        id: record._id,
        patientId:
          patient?._id ||
          chart.patientId,
        patient: patient
          ? {
              id: patient._id,
              name: patient.name,
              nic: patient.nic,
              phone: patient.phone,
              email: patient.email,
            }
          : null,
        appointment: record.appointmentId
          ? {
              id: record.appointmentId._id,
              appointmentDate:
                record.appointmentId.appointmentDate,
              startTime:
                record.appointmentId.startTime,
              endTime:
                record.appointmentId.endTime,
              type:
                record.appointmentId.type,
              visitPurpose:
                record.appointmentId.visitPurpose,
              status:
                record.appointmentId.status,
              tokenNumber:
                record.appointmentId.tokenNumber,
            }
          : null,
        treatmentType:
          record.treatmentTypeId
            ? {
                id: record.treatmentTypeId._id,
                code: record.treatmentTypeId.code,
                name: record.treatmentTypeId.name,
                category:
                  record.treatmentTypeId.category,
                price:
                  record.treatmentTypeId.price,
              }
            : {
                id: record.treatmentTypeId,
                name:
                  record.treatmentTypeName || '',
              },
        treatmentTypeId:
          record.treatmentTypeId?._id ||
          record.treatmentTypeId ||
          null,
        treatmentTypeName:
          record.treatmentTypeName || '',
        treatmentPrice:
          toNumber(record.treatmentPrice),
        treatmentDate:
          record.treatmentDate,
        dentist: record.dentistId
          ? {
              id: record.dentistId._id,
              name: record.dentistId.name,
              email: record.dentistId.email,
              role: record.dentistId.role,
            }
          : null,
        diagnosis:
          record.diagnosis || '',
        treatment:
          record.treatment || '',
        notes:
          record.notes || '',
        followUpDate:
          record.followUpDate || null,
        materialsUsed:
          record.materialsUsed || [],
      });
    }
  }

  records.sort((a, b) => {
    return (
      new Date(b.treatmentDate || 0) -
      new Date(a.treatmentDate || 0)
    );
  });

  const totalTreatmentValue =
    records.reduce(
      (total, record) =>
        total +
        toNumber(record.treatmentPrice),
      0
    );

  const summary = {
    patientId: patientId || null,
    totalTreatmentRecords:
      records.length,
    totalTreatmentValue,
    patientsIncluded:
      new Set(
        records
          .map((record) =>
            record.patientId
              ? String(record.patientId)
              : null
          )
          .filter(Boolean)
      ).size,
  };

  return {
    reportType: patientId
      ? 'PATIENT_TREATMENTS'
      : 'ALL_TREATMENTS',
    title: patientId
      ? 'Patient Treatment History Report'
      : 'All Patient Treatment History Report',
    filters: {
      patientId: patientId || null,
    },
    summary,
    data: {
      records,
    },
  };
}

async function buildRevenueReport(req) {
  const range =
    getDateRangeFromQuery(req);

  const invoices =
    await Invoice.find({
      issuedDate: {
        $gte: range.start,
        $lt: range.endExclusive,
      },
    })
      .populate(
        'patientId',
        'name nic phone email'
      )
      .populate(
        'treatmentTypeId',
        'code name category price'
      )
      .sort({
        issuedDate: -1,
      })
      .lean();

  const payments =
    await Payment.find({
      paymentDate: {
        $gte: range.start,
        $lt: range.endExclusive,
      },
    })
      .populate(
        'invoiceId',
        'invoiceNumber treatmentName totalAmount'
      )
      .populate(
        'receivedBy',
        'name email role'
      )
      .sort({
        paymentDate: -1,
      })
      .lean();

  const totalInvoiced =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(invoice.totalAmount),
      0
    );

  const totalInvoiceAmountPaid =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(invoice.amountPaid),
      0
    );

  const totalOutstanding =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(
          invoice.outstandingBalance
        ),
      0
    );

  const paymentsCollected =
    payments.reduce(
      (total, payment) =>
        total +
        toNumber(payment.amount),
      0
    );

  const invoiceStatusCounts =
    invoices.reduce(
      (result, invoice) => {
        const status =
          invoice.status || 'UNKNOWN';

        result[status] =
          (result[status] || 0) + 1;

        return result;
      },
      {}
    );

  const revenueByTreatment = {};

  for (const invoice of invoices) {
    const name =
      invoice.treatmentName ||
      'Unknown Treatment';

    if (!revenueByTreatment[name]) {
      revenueByTreatment[name] = {
        treatmentName: name,
        invoiceCount: 0,
        totalInvoiced: 0,
        amountPaid: 0,
        outstandingBalance: 0,
      };
    }

    revenueByTreatment[name]
      .invoiceCount += 1;

    revenueByTreatment[name]
      .totalInvoiced +=
      toNumber(invoice.totalAmount);

    revenueByTreatment[name]
      .amountPaid +=
      toNumber(invoice.amountPaid);

    revenueByTreatment[name]
      .outstandingBalance +=
      toNumber(
        invoice.outstandingBalance
      );
  }

  const summary = {
    period: {
      startDate: range.startDate,
      endDate: range.endDate,
    },
    invoiceCount: invoices.length,
    paymentCount: payments.length,
    totalInvoiced,
    totalInvoiceAmountPaid,
    totalOutstanding,
    paymentsCollected,
    invoiceStatusCounts,
  };

  return {
    reportType: 'REVENUE',
    title: 'Revenue Report',
    filters: {
      period:
        req.query.period || 'day',
      date:
        req.query.date || null,
      startDate:
        range.startDate,
      endDate:
        range.endDate,
    },
    summary,
    data: {
      invoices,
      payments,
      revenueByTreatment:
        Object.values(
          revenueByTreatment
        ),
    },
  };
}

async function buildPaymentReport(req) {
  const { patientId } = req.query;

  let patient = null;

  if (patientId) {
    patient =
      await findPatient(patientId);
  }

  const query = {};

  if (patientId) {
    query.patientId = patientId;
  }

  let range = null;

  if (
    req.query.period ||
    req.query.date ||
    req.query.startDate ||
    req.query.endDate
  ) {
    range =
      getDateRangeFromQuery(req);

    query.paymentDate = {
      $gte: range.start,
      $lt: range.endExclusive,
    };
  }

  const payments =
    await Payment.find(query)
      .populate(
        'invoiceId',
        'invoiceNumber treatmentName totalAmount amountPaid outstandingBalance status issuedDate'
      )
      .populate(
        'patientId',
        'name nic phone email'
      )
      .populate(
        'receivedBy',
        'name email role'
      )
      .sort({
        paymentDate: -1,
      })
      .lean();

  const invoicesQuery = {};

  if (patientId) {
    invoicesQuery.patientId = patientId;
  }

  const invoices =
    await Invoice.find(
      invoicesQuery
    )
      .sort({
        issuedDate: -1,
      })
      .lean();

  const totalPayments =
    payments.reduce(
      (total, payment) =>
        total +
        toNumber(payment.amount),
      0
    );

  const paymentByMethod =
    payments.reduce(
      (result, payment) => {
        const method =
          payment.method || 'OTHER';

        result[method] =
          (result[method] || 0) +
          toNumber(payment.amount);

        return result;
      },
      {}
    );

  const invoiceTotal =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(invoice.totalAmount),
      0
    );

  const invoicePaid =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(invoice.amountPaid),
      0
    );

  const invoiceOutstanding =
    invoices.reduce(
      (total, invoice) =>
        total +
        toNumber(
          invoice.outstandingBalance
        ),
      0
    );

  const summary = {
    patient: patient
      ? {
          id: patient._id,
          name: patient.name,
          nic: patient.nic,
          phone: patient.phone,
          email: patient.email,
        }
      : null,
    paymentCount: payments.length,
    totalPayments,
    paymentByMethod,
    invoiceCount: invoices.length,
    invoiceTotal,
    invoicePaid,
    invoiceOutstanding,
    dateRange: range
      ? {
          startDate: range.startDate,
          endDate: range.endDate,
        }
      : null,
  };

  return {
    reportType: patientId
      ? 'PATIENT_PAYMENTS'
      : 'ALL_PAYMENTS',
    title: patientId
      ? 'Patient Payment Report'
      : 'All Patient Payment Report',
    filters: {
      patientId: patientId || null,
      startDate:
        range?.startDate || null,
      endDate:
        range?.endDate || null,
    },
    summary,
    data: {
      payments,
      invoices,
    },
  };
}

async function buildAppointmentReport(req) {
  const range =
    getDateRangeFromQuery(req);

  const query = {
    appointmentDate: {
      $gte: range.startDate,
      $lte: range.endDate,
    },
  };

  if (req.query.patientId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.query.patientId
      )
    ) {
      const error = new Error(
        'Invalid patient ID.'
      );

      error.statusCode = 400;
      throw error;
    }

    query.patientId =
      req.query.patientId;
  }

  if (req.query.doctorId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.query.doctorId
      )
    ) {
      const error = new Error(
        'Invalid doctor ID.'
      );

      error.statusCode = 400;
      throw error;
    }

    query.doctorId =
      req.query.doctorId;
  }

  if (req.query.status) {
    query.status =
      String(req.query.status)
        .trim()
        .toUpperCase();
  }

  if (req.query.visitPurpose) {
    query.visitPurpose =
      String(
        req.query.visitPurpose
      )
        .trim()
        .toUpperCase();
  }

  const appointments =
    await Appointments.find(query)
      .populate(
        'patientId',
        'name nic phone email'
      )
      .populate(
        'doctorId',
        'name email role'
      )
      .populate(
        'calledBy',
        'name email role'
      )
      .populate(
        'completedBy',
        'name email role'
      )
      .sort({
        appointmentDate: 1,
        startTime: 1,
      })
      .lean();

  const statusCounts =
    appointments.reduce(
      (result, appointment) => {
        const status =
          appointment.status ||
          'UNKNOWN';

        result[status] =
          (result[status] || 0) + 1;

        return result;
      },
      {}
    );

  const visitPurposeCounts =
    appointments.reduce(
      (result, appointment) => {
        const purpose =
          appointment.visitPurpose ||
          'UNKNOWN';

        result[purpose] =
          (result[purpose] || 0) + 1;

        return result;
      },
      {}
    );

  const appointmentsByDate =
    appointments.reduce(
      (result, appointment) => {
        const date =
          appointment.appointmentDate;

        if (!result[date]) {
          result[date] = 0;
        }

        result[date] += 1;

        return result;
      },
      {}
    );

  const summary = {
    period: {
      startDate: range.startDate,
      endDate: range.endDate,
    },
    totalAppointments:
      appointments.length,
    statusCounts,
    visitPurposeCounts,
    appointmentsByDate,
  };

  return {
    reportType: 'APPOINTMENTS',
    title: 'Appointment Report',
    filters: {
      period:
        req.query.period || 'day',
      date:
        req.query.date || null,
      startDate:
        range.startDate,
      endDate:
        range.endDate,
      patientId:
        req.query.patientId || null,
      doctorId:
        req.query.doctorId || null,
      status:
        req.query.status || null,
      visitPurpose:
        req.query.visitPurpose || null,
    },
    summary,
    data: {
      appointments,
    },
  };
}

async function buildReport(req, type) {
  switch (type) {
    case 'inventory':
      return buildInventoryReport();

    case 'treatments':
      return buildTreatmentReport(req);

    case 'revenue':
      return buildRevenueReport(req);

    case 'payments':
      return buildPaymentReport(req);

    case 'appointments':
      return buildAppointmentReport(req);

    default: {
      const error = new Error(
        'Invalid report type. Use inventory, treatments, revenue, payments, or appointments.'
      );

      error.statusCode = 400;
      throw error;
    }
  }
}

exports.getInventoryReport = async (
  req,
  res
) => {
  try {
    const report =
      await buildInventoryReport();

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    return res.status(200).json({
      success: true,
      report: {
        id: savedReport._id,
        reportType:
          report.reportType,
        title:
          report.title,
        generatedAt:
          savedReport.generatedAt,
      },
      filters:
        report.filters,
      summary:
        report.summary,
      data:
        report.data,
    });
  } catch (error) {
    console.error(
      'Inventory report error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate inventory report.',
    });
  }
};

exports.getTreatmentReport = async (
  req,
  res
) => {
  try {
    const report =
      await buildTreatmentReport(req);

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    return res.status(200).json({
      success: true,
      report: {
        id: savedReport._id,
        reportType:
          report.reportType,
        title:
          report.title,
        generatedAt:
          savedReport.generatedAt,
      },
      filters:
        report.filters,
      summary:
        report.summary,
      data:
        report.data,
    });
  } catch (error) {
    console.error(
      'Treatment report error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate treatment report.',
    });
  }
};

exports.getRevenueReport = async (
  req,
  res
) => {
  try {
    const report =
      await buildRevenueReport(req);

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    return res.status(200).json({
      success: true,
      report: {
        id: savedReport._id,
        reportType:
          report.reportType,
        title:
          report.title,
        generatedAt:
          savedReport.generatedAt,
      },
      filters:
        report.filters,
      summary:
        report.summary,
      data:
        report.data,
    });
  } catch (error) {
    console.error(
      'Revenue report error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate revenue report.',
    });
  }
};

exports.getPaymentReport = async (
  req,
  res
) => {
  try {
    const report =
      await buildPaymentReport(req);

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    return res.status(200).json({
      success: true,
      report: {
        id: savedReport._id,
        reportType:
          report.reportType,
        title:
          report.title,
        generatedAt:
          savedReport.generatedAt,
      },
      filters:
        report.filters,
      summary:
        report.summary,
      data:
        report.data,
    });
  } catch (error) {
    console.error(
      'Payment report error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate payment report.',
    });
  }
};

exports.getAppointmentReport = async (
  req,
  res
) => {
  try {
    const report =
      await buildAppointmentReport(req);

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    return res.status(200).json({
      success: true,
      report: {
        id: savedReport._id,
        reportType:
          report.reportType,
        title:
          report.title,
        generatedAt:
          savedReport.generatedAt,
      },
      filters:
        report.filters,
      summary:
        report.summary,
      data:
        report.data,
    });
  } catch (error) {
    console.error(
      'Appointment report error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate appointment report.',
    });
  }
};

exports.exportReportPdf = async (
  req,
  res
) => {
  try {
    const type =
      String(req.query.type || '')
        .trim()
        .toLowerCase();

    const report =
      await buildReport(req, type);

    const savedReport =
      await saveReportRecord({
        reportType:
          report.reportType,
        generatedBy:
          req.user.id,
        filters:
          report.filters,
        summary:
          report.summary,
      });

    const pdfBuffer =
      await generateReportPdf({
        report,
        reportId:
          savedReport._id.toString(),
      });

    const safeType =
      type.replace(
        /[^a-z0-9-_]/gi,
        '-'
      );

    const fileName =
      `${safeType}-report-${Date.now()}.pdf`;

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    res.setHeader(
      'Content-Length',
      pdfBuffer.length
    );

    return res.status(200).send(
      pdfBuffer
    );
  } catch (error) {
    console.error(
      'Report PDF error:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to generate report PDF.',
    });
  }
};