const mongoose = require('mongoose');

/**
 * ==========================================================
 * MATERIAL USED
 * ==========================================================
 *
 * Represents a consumable inventory item used during
 * a particular treatment.
 *
 * Examples:
 *
 * - Metal Bracket × 2
 * - Intermaxillary Elastic × 4
 * - Composite Resin × 2 grams
 *
 * Reusable instruments are NOT stored here.
 * ==========================================================
 */
const materialUsedSchema = new mongoose.Schema(
  {
    /**
     * Inventory item that was consumed.
     */
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },

    /**
     * Snapshot of the item name at the time of treatment.
     *
     * This is useful for historical records even if the
     * inventory item is renamed later.
     */
    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Quantity consumed during this treatment.
     */
    quantityUsed: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Unit used by the inventory item.
     *
     * Examples:
     * piece
     * gram
     * ml
     */
    unit: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    _id: true,
  }
);


/**
 * ==========================================================
 * TREATMENT RECORD
 * ==========================================================
 *
 * Each treatment belongs to one patient's DentalChart.
 *
 * Future treatments for the same patient are added to the
 * same treatmentRecords array.
 * ==========================================================
 */
const treatmentRecordSchema = new mongoose.Schema(
  {
    /**
     * Appointment that produced this treatment record.
     * Optional for backward compatibility with older records.
     */
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },

    /**
     * Configured dental treatment/service used for billing.
     */
    treatmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DentalTreatment',
      default: null,
    },

    treatmentTypeName: {
      type: String,
      default: '',
      trim: true,
    },

    /**
     * Snapshot of the clinic price at treatment time.
     * Inventory unit prices are deliberately not used for billing.
     */
    treatmentPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Date on which the treatment was performed.
     */
    treatmentDate: {
      type: Date,
      default: Date.now,
    },

    /**
     * Dentist who performed the treatment.
     */
    dentistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Diagnosis made during this treatment.
     */
    diagnosis: {
      type: String,
      trim: true,
      default: '',
    },

    /**
     * Treatment/procedure performed.
     */
    treatment: {
      type: String,
      trim: true,
      default: '',
    },

    /**
     * Additional clinical notes.
     */
    notes: {
      type: String,
      trim: true,
      default: '',
    },

    /**
     * Optional follow-up date.
     */
    followUpDate: {
      type: Date,
      default: null,
    },

    /**
     * ========================================================
     * MATERIALS USED
     * ========================================================
     *
     * Only consumable inventory items belong here.
     *
     * Reusable equipment such as:
     *
     * - scissors
     * - mirrors
     * - forceps
     *
     * is NOT recorded here.
     */
    materialsUsed: {
      type: [materialUsedSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


/**
 * ==========================================================
 * DENTAL CHART
 * ==========================================================
 *
 * One patient = one DentalChart.
 *
 * patientId is unique, which prevents multiple dental
 * charts from being created for the same patient.
 * ==========================================================
 */
const dentalChartSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    /**
     * All treatment records belonging to this patient's
     * unique dental chart.
     */
    treatmentRecords: {
      type: [treatmentRecordSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


const DentalChart = mongoose.model(
  'DentalChart',
  dentalChartSchema
);


module.exports = DentalChart;
