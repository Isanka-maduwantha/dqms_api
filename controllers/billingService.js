const mongoose = require('mongoose');
const DentalChart = require('../models/DentalChart');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const User = require('../models/user');
const clinic = require('../config/clinic');

function getBillingPurpose(appointment) {
  if (appointment?.visitPurpose) {
    return appointment.visitPurpose;
  }

  // Backward compatibility with existing appointments.
  if (appointment?.type === 'CHECKUP') {
    return 'CHECKUP';
  }

  return 'NEW_TREATMENT';
}

function makeInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `INV-${date}-${random}`;
}

async function findTreatmentForAppointment(appointmentId, session) {
  const chart = await DentalChart.findOne({
    'treatmentRecords.appointmentId': appointmentId,
  }).session(session || null);

  if (!chart) return null;

  const treatment = chart.treatmentRecords.find(
    (record) => record.appointmentId?.toString() === appointmentId.toString(),
  );

  if (!treatment) return null;

  return { chart, treatment };
}

async function createInvoiceForAppointment(appointment, options = {}) {
  const { session = null } = options;

  const purpose = getBillingPurpose(appointment);

  if (purpose !== 'NEW_TREATMENT') {
    return {
      created: false,
      reason: purpose === 'FOLLOW_UP'
        ? 'FOLLOW_UP_APPOINTMENT'
        : 'NON_BILLABLE_APPOINTMENT',
      invoice: null,
    };
  }

  const existingInvoice = await Invoice.findOne({
    appointmentId: appointment._id,
  }).session(session || null);

  if (existingInvoice) {
    return {
      created: false,
      reason: 'INVOICE_ALREADY_EXISTS',
      invoice: existingInvoice,
    };
  }

  const treatmentData = await findTreatmentForAppointment(
    appointment._id,
    session,
  );

  if (!treatmentData) {
    const error = new Error(
      'No treatment record is linked to this appointment. Complete the treatment record before ending the session.',
    );
    error.statusCode = 400;
    throw error;
  }

  const { treatment } = treatmentData;

  if (!treatment.treatmentTypeId || typeof treatment.treatmentPrice !== 'number') {
    const error = new Error(
      'The treatment record does not contain a valid treatment price.',
    );
    error.statusCode = 400;
    throw error;
  }

  const patient = await User.findOne({
    _id: appointment.patientId,
    role: 'patient',
  })
    .select('_id name phone email nic')
    .session(session || null)
    .lean();

  if (!patient) {
    const error = new Error('Patient not found while creating invoice.');
    error.statusCode = 404;
    throw error;
  }

  const totalAmount = Number(treatment.treatmentPrice);

  const invoice = new Invoice({
    invoiceNumber: makeInvoiceNumber(),
    patientId: patient._id,
    appointmentId: appointment._id,
    treatmentRecordId: treatment._id,
    treatmentTypeId: treatment.treatmentTypeId,
    treatmentName: treatment.treatmentTypeName || treatment.treatment,
    treatmentDetails: treatment.notes || treatment.diagnosis || '',
    patientSnapshot: {
      name: patient.name,
      phone: patient.phone || '',
      email: patient.email || '',
      nic: patient.nic || '',
    },
    clinicSnapshot: {
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
    },
    totalAmount,
    amountPaid: 0,
    outstandingBalance: totalAmount,
    status: totalAmount === 0 ? 'PAID' : 'UNPAID',
  });

  await invoice.save({ session: session || undefined });

  return {
    created: true,
    reason: 'NEW_TREATMENT',
    invoice,
  };
}

async function getPatientBilling(patientId) {
  const [invoices, payments] = await Promise.all([
    Invoice.find({ patientId })
      .sort({ issuedDate: -1 })
      .populate('appointmentId', 'appointmentDate startTime endTime status visitPurpose')
      .lean(),
    Payment.find({ patientId })
      .sort({ paymentDate: -1 })
      .populate('receivedBy', 'name email role')
      .lean(),
  ]);

  const paymentsByInvoice = new Map();
  for (const payment of payments) {
    const key = payment.invoiceId.toString();
    if (!paymentsByInvoice.has(key)) paymentsByInvoice.set(key, []);
    paymentsByInvoice.get(key).push(payment);
  }

  const enrichedInvoices = invoices.map((invoice) => ({
    ...invoice,
    payments: paymentsByInvoice.get(invoice._id.toString()) || [],
  }));

  const totals = enrichedInvoices.reduce(
    (acc, invoice) => {
      acc.totalAmount += invoice.totalAmount;
      acc.amountPaid += invoice.amountPaid;
      acc.outstandingBalance += invoice.outstandingBalance;
      return acc;
    },
    { totalAmount: 0, amountPaid: 0, outstandingBalance: 0 },
  );

  return { invoices: enrichedInvoices, totals };
}

async function recordPayment({ invoiceId, patientId, amount, method, notes, receivedBy }) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({
        _id: invoiceId,
        patientId,
      }).session(session);

      if (!invoice) {
        const error = new Error('Invoice not found for this patient.');
        error.statusCode = 404;
        throw error;
      }

      if (invoice.status === 'CANCELLED') {
        const error = new Error('Cannot make a payment against a cancelled invoice.');
        error.statusCode = 400;
        throw error;
      }

      if (amount > invoice.outstandingBalance) {
        const error = new Error(
          `Payment exceeds the outstanding balance of LKR ${invoice.outstandingBalance}.`,
        );
        error.statusCode = 400;
        throw error;
      }

      const payment = new Payment({
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        amount,
        method,
        notes: notes || '',
        receivedBy,
        isInstallment: amount < invoice.totalAmount,
      });

      await payment.save({ session });

      invoice.amountPaid += amount;
      invoice.outstandingBalance = Math.max(
        0,
        invoice.totalAmount - invoice.amountPaid,
      );
      invoice.status = invoice.outstandingBalance === 0
        ? 'PAID'
        : invoice.amountPaid > 0
          ? 'PARTIALLY_PAID'
          : 'UNPAID';

      await invoice.save({ session });

      result = { payment, invoice };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  getBillingPurpose,
  createInvoiceForAppointment,
  getPatientBilling,
  recordPayment,
};
