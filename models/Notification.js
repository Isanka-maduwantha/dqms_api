const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    /**
     * ==========================================================
     * NOTIFICATION RECIPIENT
     * ==========================================================
     *
     * Currently notifications are sent to administrators.
     *
     * We keep a reference to the User document so this will also
     * support multiple administrators in the future.
     */
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * ==========================================================
     * NOTIFICATION TYPE
     * ==========================================================
     */
    type: {
      type: String,
      required: true,
      enum: [
        'LOW_STOCK',
      ],
      default: 'LOW_STOCK',
      index: true,
    },

    /**
     * ==========================================================
     * NOTIFICATION CONTENT
     * ==========================================================
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * ==========================================================
     * INVENTORY REFERENCE
     * ==========================================================
     *
     * Keeping the inventory item ID means the admin can later
     * open the exact inventory item from the notification.
     */
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    reorderThreshold: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * ==========================================================
     * READ STATUS
     * ==========================================================
     */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * ==========================================================
 * INDEX
 * ==========================================================
 *
 * Prevent multiple unread LOW_STOCK notifications for the same
 * inventory item and administrator.
 *
 * Once the notification is marked as read, another low-stock
 * notification can be generated later if the item crosses the
 * threshold again.
 */
NotificationSchema.index(
  {
    recipientId: 1,
    inventoryItemId: 1,
    type: 1,
    isRead: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isRead: false,
    },
  },
);

const Notification = mongoose.model(
  'Notification',
  NotificationSchema,
);

module.exports = Notification;