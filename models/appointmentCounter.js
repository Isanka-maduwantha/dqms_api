const mongoose = require('mongoose');

const AppointmentCounterSchema = new mongoose.Schema(
  {
    appointmentDate: { type: String, required: true },
    appointmentPeriod: { type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING'], required: true },
    nextNumber: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

AppointmentCounterSchema.index({ appointmentDate: 1, appointmentPeriod: 1 }, { unique: true });

module.exports = mongoose.model('AppointmentCounter', AppointmentCounterSchema);
