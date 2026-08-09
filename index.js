const express = require('express');
const http = require('http');
const path = require('path');
const env = require('./config/env');
const app = express();
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointmentRoutes');
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
  credentials: true 
}));

app.use(express.json());

// Static file storage for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/dentist', dentistRoutes); 
app.use('/api/billing', billingRoutes); 
app.use('/api/inventory', inventoryRoutes); 

app.get('/', (req, res) => {
    res.send(`You Are On PORT ${PORT}`);
});

// Create HTTP server to attach Socket.io
const server = http.createServer(app);
socket.init(server); 

server.listen(PORT, () => {
    console.log(`Server is Listening on PORT : ${PORT}`);
});

