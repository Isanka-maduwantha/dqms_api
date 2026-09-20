const mongoose = require('mongoose');
const Appointments = require('../models/Appointments');
const { validateAppointmentPeriod, allocateAppointmentNumber, getPeriodConfig, createError } = require('../helpers/appointmentPeriods');
const { generateAppointmentSlipPdf } = require('../helpers/generateAppointmentSlipPdf');

async function getUpcomingAppointments(req, res) {
  try {
    const patientId = req.user?.id;
    if (!patientId) return res.status(401).json({ success: false, message: 'Authenticated patient information is missing.' });

    const appointments = await Appointments.find({ patientId })
      .populate('treatmentTypeId', 'code name category description price')
      .sort({ appointmentDate: 1, appointmentPeriod: 1, appointmentNumber: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully.',
      upcomingAppointments: appointments,
    });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to retrieve appointments.' });
  }
}

async function cancelAppointment(req, res) {
  try {
    const userId = req.user?.id;
    const { _id } = req.body || {};
    if (!userId || !_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ success: false, message: 'Valid appointment ID is required.' });
    }

    const appointment = await Appointments.findOne({ _id, patientId: userId, status: 'BOOKED' });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found, already cancelled, completed, or unauthorized.' });
    }

    appointment.status = 'CANCELLED';
    await appointment.save();
    return res.status(200).json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to cancel appointment.' });
  }
}

async function rescheduleAppointment(req, res) {
  try {
    const userId = req.user?.id;
    const { _id, appointmentDate, appointmentPeriod } = req.body || {};

    if (!userId || !_id || !appointmentDate || !appointmentPeriod) {
      return res.status(400).json({ success: false, message: 'Appointment ID, appointment date and appointment period are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID.' });
    }

    const appointment = await Appointments.findOne({ _id, patientId: userId });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment does not exist or is unauthorized.' });
    if (appointment.status !== 'BOOKED') return res.status(400).json({ success: false, message: `Only BOOKED appointments can be rescheduled. Current status is ${appointment.status}.` });

    const validation = await validateAppointmentPeriod(appointmentDate, appointmentPeriod);
    const period = validation.period;
    const config = getPeriodConfig(period);
    let updatedAppointment = null;

    for (let attempt = 0; attempt < 8 && !updatedAppointment; attempt += 1) {
      const nextNumber = await allocateAppointmentNumber(appointmentDate, period);
      try {
        updatedAppointment = await Appointments.findOneAndUpdate(
          { _id, patientId: userId, status: 'BOOKED' },
          {
            $set: {
              appointmentDate,
              appointmentPeriod: period,
              appointmentNumber: nextNumber,
              startTime: config.startTime,
              endTime: config.endTime,
              tokenNumber: null,
              isPriority: false,
              priorityType: null,
              priorityMarkedAt: null,
              priorityMarkedBy: null,
            },
          },
          { new: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }

    if (!updatedAppointment) throw createError('The selected appointment period was just updated. Please try again.', 409);
    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      appointment: updatedAppointment,
      appointmentNumber: updatedAppointment.appointmentNumber,
      appointmentPeriod: updatedAppointment.appointmentPeriod,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
}

async function generateSlip(req, res) {
  try {
    const patientId = req.user?.id;
    const { _id } = req.body || {};
    if (!patientId || !_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ success: false, message: 'Valid appointment ID is required.' });
    }

    const appointment = await Appointments.findOne({ _id, patientId }).lean();
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized.' });

    const slip = await generateAppointmentSlipPdf(appointment);
    if (!slip) return res.status(500).json({ success: false, message: 'Unable to generate appointment PDF.' });

    res.setHeader('Content-Type', slip.contentType);
    res.setHeader(slip.setHeader, slip.attachment);
    return res.send(slip.pdf);
  } catch (error) {
    console.error('Generate appointment slip error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to generate appointment slip.' });
  }
}

module.exports = { getUpcomingAppointments, rescheduleAppointment, cancelAppointment, generateSlip };
