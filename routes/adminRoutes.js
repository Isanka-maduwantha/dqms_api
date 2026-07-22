const express = require('express')
const Routes = express.Router();

Routes.get('/',(req,res)=> {
    res.send("Admin Routes")
})

module.exports = Routes