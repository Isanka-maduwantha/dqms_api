const express = require('express')
const Router = express.Router()
const env = require('../config/env')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const {login,registerUser} = require('../controllers/authController.js')
Router.post('/login',login)

Router.post('/register', registerUser)
module.exports = Router;