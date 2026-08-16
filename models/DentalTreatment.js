const mongoose = require('mongoose');

const DentalTreatmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    aliases: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

DentalTreatmentSchema.index({ name: 1, isActive: 1 });
DentalTreatmentSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('DentalTreatment', DentalTreatmentSchema);
