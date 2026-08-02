const express = require('express');
const router = express.Router();
const { getSlots } = require('../controllers/appointmentController')

router.get('/availale-slots',getSlots)

module.exports = router;