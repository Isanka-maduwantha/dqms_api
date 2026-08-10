const express = require('express');
const router = express.Router();

const { getSlots, bookAppointment } = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');

router.get('/available-slots', authenticateToken, getSlots);

// Keep the two old misspellings temporarily so older screens do not break.
router.get('/availabe-slots', authenticateToken, getSlots);
router.get('/availale-slots', authenticateToken, getSlots);

router.post('/book-appointment', authenticateToken, bookAppointment);

module.exports = router;
