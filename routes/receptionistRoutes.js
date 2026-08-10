const express = require('express');

const router = express.Router();

const receptionistController =
  require('../controllers/receptionistController');

// ==========================================================
// PATIENT MANAGEMENT
// ==========================================================

router.get(
  '/patients',
  receptionistController.getAllPatients
);

router.get(
  '/patients/search',
  receptionistController.searchPatients
);

router.post(
  '/patient',
  receptionistController.addPatient
);

router.patch(
  '/patient/:patientId',
  receptionistController.updatePatient
);

router.delete(
  '/patient/:patientId',
  receptionistController.deletePatient
);

// ==========================================================
// APPOINTMENTS & QUEUE
// ==========================================================

router.get(
  '/today',
  receptionistController.getTodayAppointments
);

router.get(
  '/queue',
  receptionistController.getQueue
);

router.patch(
  '/check-in/:appointmentId',
  receptionistController.markArrived
);

// ==========================================================
// SCENARIO 3
// Receptionist books appointment for patient.
// ==========================================================

router.post(
  '/book-appointment',
  receptionistController.bookAppointmentForPatient
);

// ==========================================================
// WALK-IN
// ==========================================================

router.post(
  '/walk-in',
  receptionistController.generateWalkInToken
);

module.exports = router;