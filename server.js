const express = require('express');
const env = require('./config/env');
const app = express();
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminNotificationRoutes = require('./routes/adminNotificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dentistRoutes = require('./routes/dentistRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const receptionistRoutes = require('./routes/receptionistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const lobby = require('./routes/lobby')
const PORT = env.PORT || 3000;
const cors = require('cors');
const dbConnection = require('./config/db');
const dns = require('node:dns');

dns.setServers(['8.8.8.8', '1.1.1.1']); // Forces Node to use Google and Cloudflare DNS

dbConnection();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true 
}));

app.use(express.json());
// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminNotificationRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/dentist', dentistRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/public/',lobby)
app.get('/', (req, res) => {
    res.send(`You Are On PORT ${PORT}`);
});

app.listen(PORT, () => {
    console.log(`Server is Listening on PORT : ${PORT}`);
});