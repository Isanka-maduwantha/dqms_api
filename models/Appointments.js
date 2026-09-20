const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    appointmentDate: { type: String, required: true },
    appointmentPeriod: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING'],
      default: null,
    },
    appointmentCategory: {
      type: String,
      enum: ['ROUTINE_CHECKUP', 'NEW_PATIENT_REGISTRATION', 'SPECIALIST_OTHER_PURPOSE'],
      default: null,
    },
    appointmentNumber: { type: Number, default: null },
    treatmentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'DentalTreatment', default: null },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    type: {
      type: String,
      enum: ['CHECKUP', 'ARRIVED', 'NEW_PATIENT', 'EMERGENCY', 'OTHER'],
      default: 'CHECKUP',
    },

    /*
     * Visit purpose is deliberately empty when a patient creates
     * an appointment online.
     *
     * Reception selects the purpose during check-in:
     * NEW_TREATMENT | FOLLOW_UP | CHECKUP_SCREENING
     *
     * This is important because billing is decided from the
     * receptionist's confirmed visit purpose, not from the
     * patient's online booking.
     */
    visitPurpose: {
      type: String,
      enum: ['NEW_TREATMENT', 'FOLLOW_UP', 'CHECKUP_SCREENING'],
      default: null,
    },

    status: {
      type: String,
      enum: ['BOOKED', 'ARRIVED', 'IN_CONSULTATION', 'CANCELLED', 'COMPLETED'],
      default: 'BOOKED',
    },
    tokenNumber: { type: Number, default: null },
    isPriority: { type: Boolean, default: false },
    priorityType: { type: String, enum: ['EMERGENCY'], default: null },
    priorityMarkedAt: { type: Date, default: null },
    priorityMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    calledAt: { type: Date, default: null },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

AppointmentSchema.index(
  { appointmentDate: 1, appointmentPeriod: 1, appointmentNumber: 1 },
  { unique: true, partialFilterExpression: { appointmentNumber: { $type: 'number' } } },
);

AppointmentSchema.index(
  { appointmentDate: 1, tokenNumber: 1 },
  { unique: true, partialFilterExpression: { tokenNumber: { $type: 'number' } } },
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
