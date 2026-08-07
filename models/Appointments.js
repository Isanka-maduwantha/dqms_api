const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentDate: { type: String, required: true }, // 'YYYY-MM-DD'
  startTime: { type: String, required: true },       // '09:15'
  endTime: { type: String, required: true },         // '09:30'
  type: {type: String, enum: ['CHECKUP','NEW_PATIENT','EMERGENCY','OTHER'], default: 'OTHER'},
  status: { type: String, enum: ['BOOKED', 'CANCELLED', 'COMPLETED'], default: 'BOOKED' }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);