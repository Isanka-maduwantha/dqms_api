const express = require('express');

const router = express.Router();

const {
  authenticateToken,
} = require('../middleware/auth');

const {
  authorizeRole,
} = require('../middleware/authorizeRole');

const reportController =
  require('../controllers/reportController');


/**
 * ==========================================================
 * ADMIN REPORT ROUTES
 * ==========================================================
 *
 * All routes require:
 *
 * 1. Valid JWT
 * 2. role = admin
 *
 * Mounted at /api/admin/reports
 * ==========================================================
 */

router.get(
  '/inventory',
  authenticateToken,
  authorizeRole('admin'),
  reportController.getInventoryReport,
);

router.get(
  '/treatments',
  authenticateToken,
  authorizeRole('admin'),
  reportController.getTreatmentReport,
);

router.get(
  '/revenue',
  authenticateToken,
  authorizeRole('admin'),
  reportController.getRevenueReport,
);

router.get(
  '/payments',
  authenticateToken,
  authorizeRole('admin'),
  reportController.getPaymentReport,
);

router.get(
  '/appointments',
  authenticateToken,
  authorizeRole('admin'),
  reportController.getAppointmentReport,
);

router.get(
  '/export/pdf',
  authenticateToken,
  authorizeRole('admin'),
  reportController.exportReportPdf,
);

module.exports = router;
