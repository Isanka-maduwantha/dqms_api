// controllers/inventoryController.js — Module 8: Inventory & Stock Management
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

// F-8.3: Inventory Item Management (CRUD) — admin only (see routes)
// @ts-ignore
exports.createItem = async (req, res) => {
    try {
        const { itemName, category, unitPrice, quantity, lowStockThreshold } = req.body;
        if (!itemName || unitPrice === undefined) {
            return res.status(400).json({ success: false, message: 'itemName and unitPrice are required' });
        }
        const item = await InventoryItem.create({
            itemName,
            category,
            unitPrice,
            quantity: quantity || 0,
            lowStockThreshold: lowStockThreshold ?? 10
        });
        res.status(201).json({ success: true, message: 'Inventory item created', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.getItems = async (req, res) => {
    try {
        const items = await InventoryItem.find().sort({ itemName: 1 });
        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.getItemById = async (req, res) => {
    try {
        const item = await InventoryItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.updateItem = async (req, res) => {
    try {
        const { itemName, category, unitPrice, lowStockThreshold } = req.body;
        const item = await InventoryItem.findByIdAndUpdate(
            req.params.id,
            { $set: { itemName, category, unitPrice, lowStockThreshold } },
            { new: true, runValidators: true, omitUndefined: true }
        );
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Item updated', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.deleteItem = async (req, res) => {
    try {
        const item = await InventoryItem.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-8.3: Restock an item
// @ts-ignore
exports.restockItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'quantity must be a positive number' });
        }
        const item = await InventoryItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        item.quantity += quantity;
        item.lastUpdatedStock = new Date();
        await item.save();

        await InventoryTransaction.create({
            itemId: item._id,
            type: 'RESTOCK',
            quantityChange: quantity,
            reason: 'Manual restock',
            // @ts-ignore
            performedBy: req.user?.id
        });

        res.status(200).json({ success: true, message: 'Item restocked', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-8.2: Low-Stock Warning Alert — items at/under their threshold (default 10 units)
// @ts-ignore
exports.getLowStockItems = async (req, res) => {
    try {
        const items = await InventoryItem.find({ $expr: { $lte: ['$quantity', '$lowStockThreshold'] } })
            .sort({ quantity: 1 });
        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-8.1: Auto-Inventory Deductor
// Called internally (not a public route) when a dentist completes a procedure with
// materials used. Deducts stock and writes an audit trail entry per item.
// @ts-ignore
exports.deductInventoryForMaterials = async (materialsUsed, { treatmentRecordId, performedBy } = {}) => {
    const lowStockItems = [];
    for (const material of materialsUsed) {
        const item = await InventoryItem.findById(material.itemId);
        if (!item) continue; // item may have been removed since the procedure — skip rather than fail the whole record

        item.quantity = Math.max(0, item.quantity - material.quantityUsed);
        item.lastUpdatedStock = new Date();
        await item.save();

        await InventoryTransaction.create({
            itemId: item._id,
            type: 'DEDUCTION',
            quantityChange: -material.quantityUsed,
            reason: 'Auto-deducted on procedure completion',
            treatmentRecordId,
            performedBy
        });

        if (item.quantity <= item.lowStockThreshold) lowStockItems.push(item);
    }
    return lowStockItems;
};
