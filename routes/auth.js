const express = require('express')
const Router = express.Router()
const env = require('../config/env')
const jwt = require('jsonwebtoken')
Router.post('/login',(req,res)=>{
    const {email,password} = req.body;
    console.log(email,password);
   

    const user = {
        id:1,
        email: email,
    }
    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email
        },
        env.JWT_SECRET,
        {expiresIn : '1H'}
        
    )
    console.log(token)
    res.json({token})
})

module.exports = Router;