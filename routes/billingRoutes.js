// routes/billingRoutes.js — Module 7: Billing & Financial Management
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

// F-7.1: front desk / dentist raise invoices; patients only read their own
router.post('/invoice', authorizeRoles('receptionist', 'dentist', 'admin'), billingController.createInvoice);
router.get('/invoice/:id', billingController.getInvoice);
router.get('/invoice/:id/receipt', billingController.downloadReceipt);
router.get('/patient/:patientId/invoices', billingController.listPatientInvoices);

// F-7.2
router.post('/installment-plan', authorizeRoles('receptionist', 'admin'), billingController.createInstallmentPlan);
router.post('/installment-plan/:id/pay', authorizeRoles('receptionist', 'admin'), billingController.payInstallment);
router.get('/installment-plan/invoice/:invoiceId', billingController.getLedger);

// F-7.3 (Extra) — patient pays online through the portal
router.post('/pay/gateway', billingController.processGatewayPayment);

module.exports = router;
