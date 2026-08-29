const express = require('express')
const Router = express.Router()
const getLobbyData= require('../controllers/lobbyController')
Router.get("/lobby",getLobbyData)



module.exports = Router;