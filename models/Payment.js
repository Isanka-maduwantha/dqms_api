// Records every individual payment (cash at front desk, installment, or F-7.3 online gateway charge)
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['CASH', 'CARD', 'QR', 'GATEWAY'], required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' },
    transactionRef: { type: String }, // gateway/receipt reference
    paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
