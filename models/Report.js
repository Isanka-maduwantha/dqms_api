const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: [
        'INVENTORY',
        'PATIENT_TREATMENTS',
        'ALL_TREATMENTS',
        'REVENUE',
        'PATIENT_PAYMENTS',
        'ALL_PAYMENTS',
        'APPOINTMENTS',
      ],
      required: true,
      index: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({
  reportType: 1,
  generatedAt: -1,
});

module.exports = mongoose.model('Report', ReportSchema);