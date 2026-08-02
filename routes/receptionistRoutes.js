// routes/receptionistRoutes.js
const express = require('express');
const router = express.Router();
const receptionistController = require('../controllers/receptionistController');

// F-3.1
router.get('/today', receptionistController.getTodayAppointments);
router.patch('/check-in/:appointmentId', receptionistController.markArrived);

// F-3.2
router.post('/walk-in', receptionistController.generateWalkInToken);

// F-3.3
router.patch('/reschedule/:appointmentId', receptionistController.rescheduleAppointment);

// F-3.4
router.patch('/priority/:tokenId', receptionistController.setEmergencyPriority);

module.exports = router;