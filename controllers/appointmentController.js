

const WorkingHours = require('../models/WorkingHours');
const DoctorLeave = require('../models/DoctorLeave');
const Appointments = require('../models/Appointments');

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
        const patientId = req.user.userId;
        const {
            appointmentDate,
            startTime,
            endTime,
        } = req.body;

        // console.log(req.body);

        if (!appointmentDate || !startTime) {
            return res.status(400).json({ error: 'All Appointment Data is Required' });
        }

        const bookingDate = parseTimeToDate(appointmentDate, startTime);
        // console.log(bookingDate);

        const currentTime = new Date();

        if (bookingDate < currentTime) {
            return res.status(400).json({ error: 'Cannot Book appointments in past' });
        }

        const dayName = getDateName(appointmentDate);
        const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });


        if (!schedule) {
            return res.json({ slots: [], message: `Clinic Closed on ${dayName}` });
        }

        const isAppointmentExist = await Appointments.findOne({
            appointmentDate,
            startTime,
        });

        if (isAppointmentExist) {
            return res.status(400).json({
                error: 'Appointment Exist At The Selected Time Choose Another',
            });
        }

        const leaves = await DoctorLeave.findOne({ leaveDate: appointmentDate });


        if (leaves) {
            return res.status(400).json({
                error: 'Doctor is on Leave',
            });
        }

        const appointment = {
            patientId,
            appointmentDate,
            startTime,
            endTime,
        };

        // console.log(appointment);
        await Appointments.create(appointment);

        return res.json({
            success: true,
            message: 'Appointment booked Successfully',
            appointment,
        });
    } catch (error) {
        res.status(500).json({
            message: error,
        });
    }
}

/**
 * 
 * @param {string} dateStr 
 * @param {string} timeStr 
 * @returns 
 */
function parseTimeToDate(dateStr, timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return d;
}
// @ts-ignore
function getDateName(dateStr) {
    const dateObj = new Date(`${dateStr}T00:00:00`)

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    return dayName;
}
/**
 * 
 * @param {Date} dateObj 
 * @returns
 */
function formatHHMM(dateObj) {
    const h = String(dateObj.getHours()).padStart(2, '0');
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

module.exports = {
    getSlots,
    bookAppointment
}