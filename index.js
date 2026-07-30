const express = require('express');
const env = require('./config/env')
const app = express()
const authRoutes = require('./routes/auth')
const PORT = env.PORT || 3000;
const cors = require('cors');
const dbConnection = require('./config/db');
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Forces Node to use Google and Cloudflare DNS

dbConnection();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true // Enable this if sending cookies/session tokens
}));

app.use(express.json());

// connectDB()
// app.use('api/register')
app.use('/api/auth', authRoutes)
app.use('/user/patient', require('./routes/patientRoutes'));
// app.use('/user/admin', require('./routes/adminRoutes'));
// app.use('/author', require('./routes/authorRouter'));
app.get('/', (req, res) => {
    res.send(`You Are On PORT ${PORT}`)
})
app.listen(PORT, () => {
    console.log(`Server is Listening on PORT : ${PORT}`)
})