const express = require('express');
const { getPatientById,getPatientHistory } = require('../controllers/patientController');
const Router = express.Router()
const { verifyToken } = require('../middleware/auth')
Router.get('/',verifyToken,(req,res)=> {
    res.send("These Are patients List");
})
Router.get('/:id',getPatientById);

Router.get('/:id/history',getPatientHistory)
Router.get('/:id/appointments',(req,res)=> {
  
    res.send(req.params.id + "'s Appointments");
})
Router.get('/:id/treatments',(req,res)=> {
    res.send(req.params.id + "'s Treatments");
})
Router.get('/:id/invoices',(req,res)=> {
    res.send(req.params.id + "'s invoices");
})
module.exports = Router;