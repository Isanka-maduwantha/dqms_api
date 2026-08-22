const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    treatmentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    treatmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DentalTreatment',
      required: true,
    },
    treatmentName: {
      type: String,
      required: true,
      trim: true,
    },
    treatmentDetails: {
      type: String,
      default: '',
      trim: true,
    },
    patientSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      nic: { type: String, default: '' },
    },
    clinicSnapshot: {
      name: { type: String, required: true },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      default: 'UNPAID',
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
