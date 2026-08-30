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

    // Controls whether ending this appointment creates a billable invoice.
    // NEW_TREATMENT -> invoice created. FOLLOW_UP / CHECKUP -> no invoice.
    visitPurpose: {
      type: String,
      enum: ['NEW_TREATMENT', 'FOLLOW_UP', 'CHECKUP'],
      default: 'NEW_TREATMENT',
    },

    status: {
      type: String,
      enum: ['BOOKED', 'ARRIVED', 'IN_CONSULTATION', 'CANCELLED', 'COMPLETED'],
      default: 'BOOKED',
    },

    // Generated when a booked appointment is checked in.
    tokenNumber: {
      type: Number,
      default: null,
    },

    // Set when a dentist calls this patient into the queue.
    calledAt: {
      type: Date,
      default: null,
    },

    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Set when the dentist ends the consultation.
    completedAt: {
      type: Date,
      default: null,
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
