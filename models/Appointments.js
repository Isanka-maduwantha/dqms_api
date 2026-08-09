const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  appointmentDate: {
    type: String,
    required: true
  },

  startTime: {
    type: String,
    required: true
  },

  endTime: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      'BOOKED',
      'ARRIVED',
      'CANCELLED',
      'COMPLETED'
    ],
    default: 'BOOKED'
  },

  tokenNumber: {
    type: Number,
    default: null
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);