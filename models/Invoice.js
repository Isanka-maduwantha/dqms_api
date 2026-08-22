// F-7.1: Invoice & Receipt Generator
const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true }, // e.g. "Consultation Fee", "Composite Filling", "Gloves x2"
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 } // quantity * unitPrice
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    treatmentRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentRecord' },
    items: { type: [InvoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 }, // percentage
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'], default: 'UNPAID' },
    issuedDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
