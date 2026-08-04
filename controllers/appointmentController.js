

const WorkingHours = require('../models/WorkingHours');
const DoctorLeave = require('../models/DoctorLeave');
const Appointments = require('../models/Appointments');
const {validateAppointmentSlot} = require('../helpers/appointmentValidator');
const { parseTimeToDate,formatHHMM} = require('../helpers/timeDateFunctions')
// Getting Avaliable Slots 
// @ts-ignore
async function getSlots(req, res) {
    try {
        const { date } = req.query;

        if (!date) return res.status(400).json({ error: "Date is required" });

        const dateObj = new Date(`${date}T00:00:00`)

        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })

        const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });

        if (!schedule) {
            return res.json({ slots: [], message: `Clinic Closed on ${dayName} ` });
        }
        console.log(schedule)
        const bookedAppointment = await Appointments.find({
            appointmentDate: date,
            status: "BOOKED"
        });
        // 
        const leaves = await DoctorLeave.find({ leaveDate: date })
        const bookedSet = new Set(bookedAppointment.map(a => a.startTime));

        const { startTime, endTime, slotDurationMinutes } = schedule;

        const slots = [];

        let current = parseTimeToDate(date, startTime);
        const end = parseTimeToDate(date, endTime);
        const now = new Date();

        while (current < end) {
            const timeStr = formatHHMM(current);
            const isPast = current < now;

            // Check if slot is booked
            const isBooked = bookedSet.has(timeStr);

            // Check if doctor is on leave during this slot
            const isOnLeave = leaves.some(leave => {
                // @ts-ignore
                if (!leave.startTime) return true; // Full day leave
                // @ts-ignore
                const lStart = parseTimeToDate(date, leave.startTime);
                // @ts-ignore
                const lEnd = parseTimeToDate(date, leave.endTime);
                return current >= lStart && current < lEnd;
            });
            const isAvailable = !isBooked && !isOnLeave && !isPast;

            slots.push({
                time: timeStr,
                available: isAvailable,
                reason: isBooked ? 'Booked' : isOnLeave ? 'Doctor Unavailable' : isPast ? 'Past Time' : 'Available'
            });

            // Advance by slot duration (15 mins)
            current = new Date(current.getTime() + slotDurationMinutes * 60000);

        }

        return res.json({ date, slots });
    } catch (err) {
        console.error('Error fetching slots:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}


// @ts-ignore
async function bookAppointment(req, res) {
    try {
        const patientId = req.user.id;
        const {
            appointmentDate,
            startTime,
            endTime,
        } = req.body;

        await validateAppointmentSlot(appointmentDate,startTime);
        const appointment = {
            patientId,
            appointmentDate,
            startTime,
            endTime,
        };
        // console.log(appointment);
        const newAppointment = await Appointments.create(appointment);

        return res.status(201).json({
            success: true,
            message: 'Appointment booked Successfully',
            newAppointment,
        });
    } catch (error) {
        // @ts-ignore
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            // @ts-ignore
            message: error.message || 'Internal Server Error',
        });
    }
}



module.exports = {
    getSlots,
    bookAppointment
}