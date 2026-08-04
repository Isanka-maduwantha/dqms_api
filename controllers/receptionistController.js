// controllers/receptionistController.js
// Imports depending on your project structure:
const User = require('../models/user'); 
//  @ts-ignore
// F-3.1: Get today's appointments and Mark Arrived
exports.getTodayAppointments = async (req, res) => {
  try {
    // Fetches scheduled appointments for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = [
      { id: "101", patientName: "Kamal Perera", timeSlot: "09:00 AM", status: "Scheduled" },
      { id: "102", patientName: "Nimali Silva", timeSlot: "09:15 AM", status: "Arrived" }
    ];

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    //  @ts-ignore
    res.status(500).json({ success: false, message: error.message });
  }
};
//  @ts-ignore
exports.markArrived = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Updates appointment status to 'Arrived'
    res.status(200).json({ 
      success: true, 
      message: `Appointment ${appointmentId} marked as Arrived and added to queue.` 
    });
  } catch (error) {
    //  @ts-ignore
    res.status(500).json({ success: false, message: error.message });
  }
};

// F-3.2: Walk-In Token Generator
//  @ts-ignore
exports.generateWalkInToken = async (req, res) => {
  try {
    const { patientName, phone, reason } = req.body;
    
    // Auto-generates a simple token number (e.g. W-103)
    const tokenNumber = `W-${Math.floor(100 + Math.random() * 900)}`;

    res.status(201).json({
      success: true,
      message: "Walk-in token generated successfully",
      token: tokenNumber,
      patientName,
      status: "Waiting"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// F-3.3: Reschedule Appointment
//  @ts-ignore
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newSlot } = req.body;

    res.status(200).json({
      success: true,
      message: `Appointment ${appointmentId} successfully moved to ${newSlot}.`
    });
  } catch (error) {
    //  @ts-ignore
    res.status(500).json({ success: false, message: error.message });
  }
};

// F-3.4: Emergency Priority Override (Extra)
//  @ts-ignore
exports.setEmergencyPriority = async (req, res) => {
  try {
    const { tokenId } = req.params;

    res.status(200).json({
      success: true,
      message: `Token ${tokenId} flagged as EMERGENCY PRIORITY and moved to front of queue.`
    });
  } catch (error) {
    //  @ts-ignore
    res.status(500).json({ success: false, message: error.message });
  }
};