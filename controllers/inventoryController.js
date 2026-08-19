const mongoose = require('mongoose');

const InventoryItem = require('../models/InventoryItem');
const Notification = require('../models/Notification');


/**
 * ==========================================================
 * HELPER
 * ==========================================================
 */

/**
 * Validate a positive/non-negative numeric value.
 */
function isValidNonNegativeNumber(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}


/**
 * ==========================================================
 * CREATE INVENTORY ITEM
 * ==========================================================
 *
 * POST /api/inventory/items
 *
 * Example body:
 *
 * {
 *   "itemName": "Metal Bracket",
 *   "category": "ORTHODONTIC",
 *   "description": "Standard metal orthodontic bracket",
 *   "quantity": 100,
 *   "unit": "piece",
 *   "reorderThreshold": 20,
 *   "unitPrice": 150,
 *   "expiryDate": null
 * }
 * ==========================================================
 */
exports.createInventoryItem = async (req, res) => {
  try {
    const {
      itemName,
      category,
      description,
      quantity,
      unit,
      reorderThreshold,
      unitPrice,
      expiryDate,
    } = req.body || {};

    /*
     * Required fields.
     */
    if (!itemName || !String(itemName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required.',
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required.',
      });
    }

    if (!unit || !String(unit).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Unit is required.',
      });
    }

    /*
     * Numeric validation.
     */
    if (
      quantity !== undefined &&
      !isValidNonNegativeNumber(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quantity must be a number greater than or equal to 0.',
      });
    }

    if (
      reorderThreshold !== undefined &&
      !isValidNonNegativeNumber(reorderThreshold)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Reorder threshold must be a number greater than or equal to 0.',
      });
    }

    if (
      unitPrice !== undefined &&
      !isValidNonNegativeNumber(unitPrice)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unit price must be a number greater than or equal to 0.',
      });
    }

    /*
     * Check duplicate active item.
     *
     * We don't want two active records accidentally representing
     * the same inventory item.
     */
    const existingItem = await InventoryItem.findOne({
      itemName: String(itemName).trim(),
      isActive: true,
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message:
          'An active inventory item with this name already exists.',
        item: existingItem,
      });
    }

    /*
     * Validate expiry date if supplied.
     */
    let parsedExpiryDate = null;

    if (
      expiryDate !== undefined &&
      expiryDate !== null &&
      expiryDate !== ''
    ) {
      parsedExpiryDate = new Date(expiryDate);

      if (Number.isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expiry date.',
        });
      }
    }

    const inventoryItem = await InventoryItem.create({
      itemName: String(itemName).trim(),

      category: String(category)
        .trim()
        .toUpperCase(),

      description:
        description !== undefined
          ? String(description).trim()
          : '',

      quantity:
        quantity !== undefined
          ? quantity
          : 0,

      unit: String(unit)
        .trim()
        .toLowerCase(),

      reorderThreshold:
        reorderThreshold !== undefined
          ? reorderThreshold
          : 0,

      unitPrice:
        unitPrice !== undefined
          ? unitPrice
          : 0,

      expiryDate: parsedExpiryDate,

      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message:
        'Inventory item created successfully.',
      item: inventoryItem,
    });
  } catch (error) {
    console.error(
      'Create inventory item error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to create inventory item.',
    });
  }
};


/**
 * ==========================================================
 * GET ALL INVENTORY ITEMS
 * ==========================================================
 *
 * GET /api/inventory/items
 *
 * Optional query parameters:
 *
 * ?category=ORTHODONTIC
 * ?search=bracket
 * ?includeInactive=true
 * ?lowStock=true
 * ==========================================================
 */
exports.getInventoryItems = async (req, res) => {
  try {
    const {
      category,
      search,
      includeInactive,
      lowStock,
    } = req.query || {};

    const filter = {};

    /*
     * By default only active inventory items are returned.
     */
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    /*
     * Category filtering.
     */
    if (category) {
      filter.category = String(category)
        .trim()
        .toUpperCase();
    }

    /*
     * Name search.
     */
    if (
      search &&
      String(search).trim()
    ) {
      filter.itemName = {
        $regex: String(search).trim(),
        $options: 'i',
      };
    }

    /*
     * Low-stock filtering.
     *
     * quantity <= reorderThreshold
     */
    if (lowStock === 'true') {
      filter.$expr = {
        $lte: [
          '$quantity',
          '$reorderThreshold',
        ],
      };
    }

    const items =
      await InventoryItem.find(filter)
        .sort({
          category: 1,
          itemName: 1,
        });

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error(
      'Get inventory items error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve inventory items.',
    });
  }
};


/**
 * ==========================================================
 * GET SINGLE INVENTORY ITEM
 * ==========================================================
 *
 * GET /api/inventory/items/:itemId
 * ==========================================================
 */
exports.getInventoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        itemId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory item ID.',
      });
    }

    const item =
      await InventoryItem.findById(
        itemId
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory item not found.',
      });
    }

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    console.error(
      'Get inventory item error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve inventory item.',
    });
  }
};


/**
 * ==========================================================
 * UPDATE INVENTORY ITEM DETAILS
 * ==========================================================
 *
 * PUT /api/inventory/items/:itemId
 *
 * This endpoint changes item information.
 *
 * Stock quantity should normally be changed through the
 * dedicated stock endpoint below.
 * ==========================================================
 */
exports.updateInventoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        itemId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory item ID.',
      });
    }

    const {
      itemName,
      category,
      description,
      unit,
      reorderThreshold,
      unitPrice,
      expiryDate,
      isActive,
    } = req.body || {};

    const item =
      await InventoryItem.findById(
        itemId
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory item not found.',
      });
    }

    /*
     * Validate name if supplied.
     */
    if (
      itemName !== undefined &&
      !String(itemName).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Item name cannot be empty.',
      });
    }

    /*
     * Check duplicate name if name is being changed.
     */
    if (
      itemName !== undefined &&
      String(itemName).trim() !==
        item.itemName
    ) {
      const duplicate =
        await InventoryItem.findOne({
          _id: {
            $ne: itemId,
          },
          itemName:
            String(itemName).trim(),
          isActive: true,
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            'Another active inventory item with this name already exists.',
        });
      }
    }

    /*
     * Numeric validation.
     */
    if (
      reorderThreshold !== undefined &&
      !isValidNonNegativeNumber(
        reorderThreshold
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Reorder threshold must be a number greater than or equal to 0.',
      });
    }

    if (
      unitPrice !== undefined &&
      !isValidNonNegativeNumber(
        unitPrice
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unit price must be a number greater than or equal to 0.',
      });
    }

    /*
     * Expiry date validation.
     */
    let parsedExpiryDate;

    if (
      expiryDate !== undefined &&
      expiryDate !== null &&
      expiryDate !== ''
    ) {
      parsedExpiryDate =
        new Date(expiryDate);

      if (
        Number.isNaN(
          parsedExpiryDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid expiry date.',
        });
      }
    }

    /*
     * Apply supplied fields only.
     */
    if (itemName !== undefined) {
      item.itemName =
        String(itemName).trim();
    }

    if (category !== undefined) {
      item.category =
        String(category)
          .trim()
          .toUpperCase();
    }

    if (description !== undefined) {
      item.description =
        String(description).trim();
    }

    if (unit !== undefined) {
      if (!String(unit).trim()) {
        return res.status(400).json({
          success: false,
          message:
            'Unit cannot be empty.',
        });
      }

      item.unit =
        String(unit)
          .trim()
          .toLowerCase();
    }

    if (
      reorderThreshold !==
      undefined
    ) {
      item.reorderThreshold =
        reorderThreshold;
    }

    if (unitPrice !== undefined) {
      item.unitPrice =
        unitPrice;
    }

    if (expiryDate !== undefined) {
      item.expiryDate =
        expiryDate === null ||
        expiryDate === ''
          ? null
          : parsedExpiryDate;
    }

    if (isActive !== undefined) {
      if (
        typeof isActive !==
        'boolean'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'isActive must be true or false.',
        });
      }

      item.isActive =
        isActive;
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message:
        'Inventory item updated successfully.',
      item,
    });
  } catch (error) {
    console.error(
      'Update inventory item error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update inventory item.',
    });
  }
};


/**
 * ==========================================================
 * UPDATE STOCK
 * ==========================================================
 *
 * PATCH /api/inventory/items/:itemId/stock
 *
 * Body:
 *
 * {
 *   "quantity": 25,
 *   "operation": "ADD"
 * }
 *
 * OR
 *
 * {
 *   "quantity": 5,
 *   "operation": "REMOVE"
 * }
 *
 * This endpoint is for manual inventory adjustments/restocking.
 *
 * ADD:
 *   - increases stock
 *   - if stock becomes greater than reorderThreshold,
 *     dismisses the active LOW_STOCK notification
 *     for that inventory item.
 *
 * REMOVE:
 *   - decreases stock
 *   - never allows negative stock.
 *
 * Treatment-based automatic deduction is handled separately.
 * ==========================================================
 */
exports.updateStock = async (req, res) => {
  try {
    const { itemId } =
      req.params;

    const {
      quantity,
      operation,
    } = req.body || {};

    /**
     * ========================================================
     * VALIDATE ITEM ID
     * ========================================================
     */
    if (
      !mongoose.Types.ObjectId.isValid(
        itemId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid inventory item ID.',
      });
    }

    /**
     * ========================================================
     * VALIDATE QUANTITY
     * ========================================================
     */
    if (
      !isValidNonNegativeNumber(
        quantity
      ) ||
      quantity === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quantity must be a number greater than 0.',
      });
    }

    /**
     * ========================================================
     * VALIDATE OPERATION
     * ========================================================
     */
    const normalizedOperation =
      String(operation || '')
        .trim()
        .toUpperCase();

    if (
      normalizedOperation !==
        'ADD' &&
      normalizedOperation !==
        'REMOVE'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Operation must be either ADD or REMOVE.',
      });
    }

    /**
     * ========================================================
     * FIND INVENTORY ITEM
     * ========================================================
     */
    const item =
      await InventoryItem.findById(
        itemId
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          'Inventory item not found.',
      });
    }

    if (!item.isActive) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot update stock for an inactive inventory item.',
      });
    }

    /**
     * ========================================================
     * ADD STOCK
     * ========================================================
     */
    if (
      normalizedOperation ===
      'ADD'
    ) {
      item.quantity += quantity;
    }

    /**
     * ========================================================
     * REMOVE STOCK
     *
     * Never allow negative stock.
     * ========================================================
     */
    if (
      normalizedOperation ===
      'REMOVE'
    ) {
      if (
        quantity >
        item.quantity
      ) {
        return res.status(409).json({
          success: false,
          message:
            `Insufficient stock. Available: ${item.quantity} ${item.unit}.`,
          availableQuantity:
            item.quantity,
          requestedQuantity:
            quantity,
        });
      }

      item.quantity -= quantity;
    }

    /**
     * ========================================================
     * SAVE UPDATED INVENTORY
     * ========================================================
     */
    await item.save();

    /**
     * ========================================================
     * CHECK LOW STOCK
     * ========================================================
     *
     * Low stock means:
     *
     * quantity <= reorderThreshold
     */
    const isLowStock =
      item.quantity <=
      item.reorderThreshold;

    /**
     * ========================================================
     * DISMISS LOW-STOCK NOTIFICATION AFTER RESTOCKING
     * ========================================================
     *
     * Example:
     *
     * Metal Bracket
     * ----------------
     * Before: 18
     * Threshold: 20
     *
     * Admin adds 100
     *
     * After: 118
     *
     * 118 > 20
     *
     * Therefore the active LOW_STOCK notification for
     * this inventory item is dismissed.
     *
     * We mark it as read instead of deleting it so the
     * notification remains in the database as history.
     *
     * Only unread LOW_STOCK notifications are affected.
     * ========================================================
     */
    let dismissedLowStockNotifications =
      0;

    if (
      normalizedOperation ===
        'ADD' &&
      !isLowStock
    ) {
      const notificationResult =
        await Notification.updateMany(
          {
            inventoryItemId:
              item._id,

            type:
              'LOW_STOCK',

            isRead:
              false,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          }
        );

      dismissedLowStockNotifications =
        notificationResult.modifiedCount ||
        0;
    }

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */
    return res.status(200).json({
      success: true,

      message:
        normalizedOperation ===
        'ADD'
          ? 'Stock added successfully.'
          : 'Stock removed successfully.',

      item,

      stock: {
        quantity:
          item.quantity,

        unit:
          item.unit,

        reorderThreshold:
          item.reorderThreshold,

        isLowStock,
      },

      /**
       * This is mainly useful for testing/admin UI.
       *
       * Example:
       *
       * dismissedLowStockNotifications: 1
       */
      dismissedLowStockNotifications,
    });
  } catch (error) {
    console.error(
      'Update inventory stock error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update inventory stock.',
    });
  }
};