const express = require('express');
const http = require('http');
const path = require('path');
const env = require('./config/env')
const app = express()
const authRoutes = require('./routes/auth')
const appointmentRoutes = require('./routes/appointmentRoutes')
const receptionistRoutes = require('./routes/receptionistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const dentistRoutes = require('./routes/dentistRoutes');
const billingRoutes = require('./routes/billingRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const PORT = env.PORT || 3000;
const cors = require('cors');
const dbConnection = require('./config/db');
const socket = require('./config/socket');
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Forces Node to use Google and Cloudflare DNS

dbConnection();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true // Enable this if sending cookies/session tokens
}));

app.use(express.json());
// Serves uploaded X-rays / lab report attachments (F-6.5)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// connectDB()
// app.use('api/register')
app.use('/api/auth', authRoutes)
app.use('/api/appointments',appointmentRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/dentist', dentistRoutes); // Module 6
app.use('/api/billing', billingRoutes); // Module 7
app.use('/api/inventory', inventoryRoutes); // Module 8
// app.use('/user/admin', require('./routes/adminRoutes'));
// app.use('/author', require('./routes/authorRouter'));
app.get('/', (req, res) => {
    res.send(`You Are On PORT ${PORT}`)
})

const server = http.createServer(app);
socket.init(server); // powers F-6.1's real-time "patient called" broadcast

server.listen(PORT, () => {
    console.log(`Server is Listening on PORT : ${PORT}`)
})
