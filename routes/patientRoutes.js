const express = require('express');
const { getUpcomingAppointments,cancelAppointment,rescheduleAppointment,getPatientHistory } = require('../controllers/patientController');
const Router = express.Router()
const { authenticateToken } = require('../middleware/auth')
Router.get('/get-appointments',authenticateToken,getUpcomingAppointments)
Router.post('/cancel-appointment',authenticateToken,cancelAppointment);
Router.post('/reschedule-appointment',authenticateToken,rescheduleAppointment)
// Router.get('/:id/history',getPatientHistory)
// Router.get('/:id/appointments',(req,res)=> {
  
//     res.send(req.params.id + "'s Appointments");
// })
// Router.get('/:id/treatments',(req,res)=> {
//     res.send(req.params.id + "'s Treatments");
// })
// Router.get('/:id/invoices',(req,res)=> {
//     res.send(req.params.id + "'s invoices");
// })
module.exports = Router;