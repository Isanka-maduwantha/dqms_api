const express = require('express');
const router = express.Router();
const receptionistController = require('../controllers/receptionistController');

const billingController = require('../controllers/billingController');

const {
  authenticateToken,
} = require('../middleware/auth');

const {
  authorizeRole,
} = require('../middleware/authorizeRole');

// All receptionist routes require a valid JWT belonging to a
// receptionist or admin account.
router.use(authenticateToken, authorizeRole('receptionist', 'admin'));

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

// ==========================================================
// BILLING
// ==========================================================

router.get(
  '/patients/:patientId/billing',
  billingController.getPatientBilling
);

router.get(
  '/patients/:patientId/overview',
  billingController.getPatientOverview
);

router.get(
  '/invoices/:invoiceId',
  billingController.getInvoice
);

router.post(
  '/patients/:patientId/invoices/:invoiceId/payments',
  billingController.recordPayment
);

module.exports = router;
