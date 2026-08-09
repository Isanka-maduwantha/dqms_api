// Module 8: Inventory & Stock Management (F-8.1, F-8.2, F-8.3)
const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    itemName: { type: String, required: [true, 'Item name is required'], trim: true },
    category: { type: String, default: 'General' }, // e.g. Consumables, PPE, Materials
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 10 }, // F-8.2: red-flag threshold
    lastUpdatedStock: { type: Date, default: Date.now }
}, { timestamps: true });

// Virtual convenience flag used by F-8.2 (Low-Stock Warning Alert)
InventoryItemSchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.lowStockThreshold;
});
InventoryItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
