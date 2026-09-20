const mongoose = require('mongoose');
const Appointments = require('../models/Appointments');
const {
  getAppointmentPeriods,
  validateAppointmentPeriod,
  allocateAppointmentNumber,
  getPeriodConfig,
} = require('../helpers/appointmentPeriods');

async function getSlots(req, res) {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const result = await getAppointmentPeriods(date);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
}

/**
 * Patient online appointment booking.
 *
 * The patient only chooses:
 *   - appointment date
 *   - clinic period
 *
 * Appointment category and visit purpose are intentionally NOT
 * accepted from the patient anymore.
 *
 * Visit purpose is selected by the receptionist during check-in.
 */
async function bookAppointment(req, res) {
  try {
    const patientId = req.user?.id;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated patient information is missing or invalid.',
      });
    }

    const doctorId = process.env.DEFAULT_DENTIST_ID || null;
    const {
      appointmentDate,
      appointmentPeriod,
    } = req.body || {};

    const validation = await validateAppointmentPeriod(
      appointmentDate,
      appointmentPeriod,
    );

    const period = validation.period;
    const config = getPeriodConfig(period);

    let appointmentNumber = null;
    let newAppointment = null;

    for (let attempt = 0; attempt < 8 && !newAppointment; attempt += 1) {
      appointmentNumber = await allocateAppointmentNumber(
        appointmentDate,
        period,
      );

      try {
        newAppointment = await Appointments.create({
          doctorId,
          patientId,
          appointmentDate,
          appointmentPeriod: period,

          // Patient no longer selects an appointment category.
          appointmentCategory: null,

          appointmentNumber,
          treatmentTypeId: null,
          startTime: config.startTime,
          endTime: config.endTime,

          // Keep the legacy appointment type for compatibility.
          type: 'CHECKUP',

          // Receptionist will select this at check-in.
          visitPurpose: null,

          status: 'BOOKED',
          tokenNumber: null,
          isPriority: false,
          priorityType: null,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }

    if (!newAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This appointment period was just updated. Please try booking again.',
      });
    }

    const populated = await Appointments.findById(newAppointment._id).lean();

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: populated,
      appointmentNumber,
      appointmentPeriod: period,
      treatment: null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
}

module.exports = { getSlots, bookAppointment };
