const express = require('express');
const { getUpcomingAppointments,getPatientHistory } = require('../controllers/patientController');
const Router = express.Router()
const { authenticateToken } = require('../middleware/auth')
Router.get('/get-appointments',authenticateToken,getUpcomingAppointments)
// Router.get('/:id',getPatientById);

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