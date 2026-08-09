// Audit trail for stock movements. F-8.1 writes a 'DEDUCTION' entry automatically
// whenever a dentist completes a procedure; F-8.3 writes 'RESTOCK'/'MANUAL_ADJUST' entries.
const mongoose = require('mongoose');

const InventoryTransactionSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: { type: String, enum: ['DEDUCTION', 'RESTOCK', 'MANUAL_ADJUST'], required: true },
    quantityChange: { type: Number, required: true }, // negative for deductions
    reason: { type: String, default: '' },
    treatmentRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentRecord' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema);
