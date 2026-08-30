const express = require('express');

const router = express.Router();

const {
  authenticateToken,
} = require('../middleware/auth');

const {
  authorizeRole,
} = require('../middleware/authorizeRole');

const dentistController =
  require('../controllers/dentistController');


/*
 * ==========================================================
 * DENTIST ROUTES
 * ==========================================================
 *
 * All dentist routes require:
 *
 * 1. A valid JWT
 * 2. The user role must be "dentist"
 *
 * ==========================================================
 */


/**
 * ==========================================================
 * DENTIST SCENARIO 1
 *
 * Call the next patient from today's queue.
 *
 * POST /api/dentist/call-next
 * ==========================================================
 */
router.post(
  '/call-next',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.callNextPatient
);


/**
 * ==========================================================
 * DENTIST SCENARIO 2
 *
 * Search patients by:
 *
 * - Name
 * - NIC
 * - Email / Gmail
 *
 * GET /api/dentist/patients/search?q=...
 * ==========================================================
 */
router.get(
  '/patients/search',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.searchPatients
);


/**
 * GET /api/dentist/treatment-types
 * Returns the active clinic treatment/service catalogue.
 */
router.get(
  '/treatment-types',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.getTreatmentTypes
);


/**
 * ==========================================================
 * DENTIST SCENARIO 2
 *
 * Get selected patient's dental history.
 *
 * GET /api/dentist/patients/:patientId/history
 * ==========================================================
 */
router.get(
  '/patients/:patientId/history',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.getPatientHistory
);


/**
 * ==========================================================
 * DENTIST SCENARIOS 3, 4 & 5
 *
 * Create/save a treatment record.
 *
 * POST /api/dentist/patients/:patientId/treatments
 *
 * Handles:
 *
 * - New patient dental chart
 * - Existing patient dental chart
 * - Treatment history
 * - Follow-up date
 * ==========================================================
 */
router.post(
  '/patients/:patientId/treatments',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.createTreatmentRecord
);


/**
 * ==========================================================
 * DENTIST SCENARIO 6
 *
 * End the current treatment/session.
 *
 * POST /api/dentist/appointments/:appointmentId/end-treatment
 * ==========================================================
 */
router.post(
  '/appointments/:appointmentId/end-treatment',
  authenticateToken,
  authorizeRole('dentist'),
  dentistController.endTreatment
);


module.exports = router;