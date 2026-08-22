// routes/dentistRoutes.js — Module 6: Dentist Surgery Console & Visual Chart
const express = require('express');
const router = express.Router();
const dentistController = require('../controllers/dentistController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../helpers/upload');

router.use(authenticateToken, authorizeRoles('dentist'));

// F-6.1
router.post('/call-next', dentistController.callNextPatient);

// F-6.2
router.get('/chart/:patientId', dentistController.getDentalChart);
router.put('/chart/:patientId/tooth/:toothNumber', dentistController.updateTooth);

// F-6.3
router.post('/treatment-records', dentistController.createTreatmentRecord);
router.put('/treatment-records/:id', dentistController.updateTreatmentRecord);

// F-6.4
router.get('/history/:patientId', dentistController.getPatientHistory);

// F-6.5 (Extra)
router.post('/treatment-records/:id/attachments', upload.single('file'), dentistController.addAttachment);

module.exports = router;
