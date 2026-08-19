const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    /*
     * ==========================================================
     * INVENTORY ITEM
     * ==========================================================
     *
     * This model represents consumable dental materials/items
     * that the clinic keeps in stock.
     *
     * Examples:
     *
     * - Brackets
     * - Rubber bands
     * - Archwires
     * - Composite resin
     * - Dental needles
     * - Gauze
     * - Fluoride varnish
     *
     * Reusable instruments such as scissors, dental mirrors,
     * forceps, etc. are NOT intended to be tracked as treatment
     * materials in this inventory system.
     * ==========================================================
     */

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Examples:
     *
     * ORTHODONTIC
     * RESTORATIVE
     * ENDODONTIC
     * ANESTHESIA
     * PREVENTIVE
     * PERIODONTAL
     * PROSTHODONTIC
     * ORAL_SURGERY
     * IMPRESSION
     * GENERAL
     * INFECTION_CONTROL
     * OTHER
     */
    category: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * Current available stock.
     *
     * Decimal values are allowed because some materials may
     * eventually be measured by weight/volume rather than
     * individual pieces.
     */
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * Examples:
     *
     * piece
     * box
     * syringe
     * cartridge
     * gram
     * ml
     * bottle
     */
    unit: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /*
     * When quantity becomes less than or equal to this value,
     * the item is considered low stock.
     */
    reorderThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * Price for one inventory unit.
     */
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * Optional expiry date.
     *
     * This is useful for materials such as:
     *
     * - Composite
     * - Bonding agents
     * - Fluoride
     * - Anesthetic
     * - Cement
     * etc.
     */
    expiryDate: {
      type: Date,
      default: null,
    },

    /*
     * Soft-delete / deactivate flag.
     *
     * We don't delete inventory records unnecessarily because
     * the item may have historical treatment usage later.
     */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Useful indexes.
 *
 * itemName allows quick inventory searches.
 * category allows category filtering.
 * isActive allows us to hide inactive items later.
 */
InventoryItemSchema.index({
  itemName: 1,
});

InventoryItemSchema.index({
  category: 1,
});

InventoryItemSchema.index({
  isActive: 1,
});

module.exports = mongoose.model(
  'InventoryItem',
  InventoryItemSchema
);