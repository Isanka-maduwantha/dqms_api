const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Scenario 3 does not require the receptionist to choose a doctor.
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },

    appointmentDate: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ['CHECKUP', 'ARRIVED', 'NEW_PATIENT', 'EMERGENCY', 'OTHER'],
      default: 'CHECKUP',
    },

    status: {
      type: String,
      enum: ['BOOKED', 'ARRIVED', 'CANCELLED', 'COMPLETED'],
      default: 'BOOKED',
    },

    // Generated when a booked appointment is checked in.
    tokenNumber: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
