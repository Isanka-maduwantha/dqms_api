const express = require('express');
const router = express.Router();
const { getSlots, bookAppointment } = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');

router.get('/available-slots', authenticateToken, getSlots);
// Keep old misspelled URLs temporarily for frontend compatibility.
router.get('/availabe-slots', authenticateToken, getSlots);
router.get('/availale-slots', authenticateToken, getSlots);
router.post('/book-appointment', authenticateToken, bookAppointment);

module.exports = router;
