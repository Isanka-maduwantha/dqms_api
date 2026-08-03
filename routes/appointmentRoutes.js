const express = require('express');
const router = express.Router();
const { getSlots,bookAppointment } = require('../controllers/appointmentController')
const {authenticateToken }= require('../middleware/auth')
router.get('/availale-slots',authenticateToken,getSlots)
router.post('/book-appointment',authenticateToken,bookAppointment)
module.exports = router;