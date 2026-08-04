const Appointments = require('../models/Appointments');
const DoctorLeave = require('../models/DoctorLeave');
const WorkingHours = require('../models/WorkingHours')
const { getDateName } = require('./getDateName')
const { parseTimeToDate, formatHHMM } = require('../helpers/timeDateFunctions')
// @ts-ignore
exports.validateAppointmentSlot = async (appointmentDate, startTime) => {


    // check Date and Time Exists
    if (!appointmentDate || !startTime) {
        // @ts-ignore
        throw new Error('All Appointment Data is Required').statusCode(400);
    }

    // Check Appointment Time 
    const bookingDate = parseTimeToDate(appointmentDate, startTime);
    const currentTime = new Date();

    if (bookingDate < currentTime) {
        throw new Error('Cannot Book appointments in past');
    }

    // Check Clinic Closed
    const dayName = getDateName(appointmentDate);
    const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });
    if (!schedule) {
        // @ts-ignore
        throw new Error(`Clinic Closed on ${dayName}`).statusCode = 400;
    }

    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 9 || hour > 17) {
        // @ts-ignore
        throw new Error("Appointment Time Must be Within Clinic Hours(9AM - 17PM) ").statusCode(400)
    }

    // Check Appointment Already Exist
    const appointment = await Appointments.findOne({
        appointmentDate,
        startTime,
    });
    if (appointment) {
        // @ts-ignore
        throw new Error("Appointment Exist At The Selected Time Choose Another").statusCode(400);
    }

    // Check if Doctor is in Leave
    const leaves = await DoctorLeave.findOne({ leaveDate: appointmentDate });
    if (leaves) {
        // @ts-ignore
        throw new Error("Docter will be in Leave").statusCode(400);
    }
    
    return true;
}