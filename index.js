const express = require('express');
const env = require('./config/env')
const app = express()
const authRoutes = require('./routes/auth')
const PORT = env.PORT || 3000;
app.use(express.json()); 
app.use('/api/auth', authRoutes  )
app.get('/',(req,res)=> {
    res.send(`You Are On PORT ${PORT}`)
})
app.listen(PORT,()=>{
    console.log(`Server is Listning on PORT : ${PORT}`)
})