// F-7.2: Instalment Ledger Tracker — lets a patient pay a large invoice (braces, root canal, etc.)
// in partial payments while keeping an outstanding balance record.
const mongoose = require('mongoose');

const InstallmentEntrySchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: true },
    dueAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: String }, // 'YYYY-MM-DD'
    status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    paidDate: { type: Date },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
}, { _id: false });

const InstallmentPlanSchema = new mongoose.Schema({
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    numberOfInstallments: { type: Number, required: true, min: 2 },
    schedule: { type: [InstallmentEntrySchema], required: true },
    outstandingBalance: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Installment', InstallmentPlanSchema);
