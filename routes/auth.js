const express = require('express')
const Router = express.Router()
const env = require('../config/env')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { login, registerUser, registerReceptionist } = require('../controllers/authController.js')

Router.post('/login', login)
Router.post('/register', registerUser)
Router.post('/register-receptionist', registerReceptionist) // <-- Added this endpoint
Router.post('/register-admin', registerReceptionist)
module.exports = Router;