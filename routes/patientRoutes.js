const express = require('express');
const { getUpcomingAppointments,cancelAppointment,rescheduleAppointment,generateSlip } = require('../controllers/patientController');
const Router = express.Router()
const { authenticateToken } = require('../middleware/auth')
Router.get('/get-appointments',authenticateToken,getUpcomingAppointments)
Router.get('/generate-pdf',authenticateToken,generateSlip)
Router.post('/cancel-appointment',authenticateToken,cancelAppointment);
Router.post('/reschedule-appointment',authenticateToken,rescheduleAppointment)
module.exports = Router;