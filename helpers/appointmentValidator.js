const Appointments = require('../models/Appointments');
const DoctorLeave = require('../models/DoctorLeave');
const WorkingHours = require('../models/WorkingHours')
const { getDateName } = require('./getDateName')
// @ts-ignore
const { parseTimeToDate, formatHHMM } = require('../helpers/timeDateFunctions')
// @ts-ignore
exports.validateAppointmentSlot = async (appointmentDate, startTime) => {

    // check Date and Time Exists
    if (!appointmentDate || !startTime) {
        const error = new Error('All Appointment Data is Required');
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    // Check Appointment Time 
    const bookingDate = parseTimeToDate(appointmentDate, startTime);
    const currentTime = new Date();

    if (bookingDate < currentTime) {
        const error = new Error('Cannot Book appointments in past');
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    // Check Clinic Closed
    const dayName = getDateName(appointmentDate);
    const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });
    if (!schedule) {
        // @ts-ignore
        const error = new Error(`Clinic Closed on ${dayName} `);
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 9 || hour > 17) {
        // @ts-ignore
        const error = new Error("Appointment Time Must be Within Clinic Hours(9AM - 17PM) ");
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    // Check Appointment Already Exist
    const appointment = await Appointments.findOne({
        appointmentDate,
        startTime,
    });
    if (appointment) {
        // @ts-ignore
        console.log("Appointment Exist At The Selected Time Choose Another")
        const error = new Error("Appointment Exist At The Selected Time Choose Another");
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    // Check if Doctor is in Leave
    const leaves = await DoctorLeave.findOne({ leaveDate: appointmentDate });
    if (leaves) {
        // @ts-ignore
        const error = new Error("Docter will be in Leave");
        // @ts-ignore
        error.statusCode = 400;
        throw error;
    }

    return true;
}