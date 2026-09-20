const mongoose = require('mongoose');

const QueueTokenCounterSchema = new mongoose.Schema(
  {
    appointmentDate: { type: String, required: true },
    nextToken: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

QueueTokenCounterSchema.index({ appointmentDate: 1 }, { unique: true });

module.exports = mongoose.model('QueueTokenCounter', QueueTokenCounterSchema);
