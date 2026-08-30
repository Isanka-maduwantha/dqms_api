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

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
            return res.status(400).json({
                success: false,
                error: 'A valid appointment date (YYYY-MM-DD) is required.',
            });
        }

        const dateObj = new Date(`${date}T00:00:00`);
        if (Number.isNaN(dateObj.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid appointment date.',
            });
        }

        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });

        if (!schedule) {
            return res.status(200).json({
                success: true,
                date,
                slots: [],
                message: `Clinic is closed on ${dayName}.`,
            });
        }

        const bookedAppointments = await Appointments.find({
            appointmentDate: date,
            status: { $in: ['BOOKED', 'ARRIVED'] },
        }).select('startTime');

        const bookedSet = new Set(
            bookedAppointments.map((appointment) => appointment.startTime),
        );

        const leaves = await DoctorLeave.find({ leaveDate: date });
        const { startTime, endTime, slotDurationMinutes = 15 } = schedule;
        const slots = [];
        let current = parseTimeToDate(date, startTime);
        const end = parseTimeToDate(date, endTime);
        const now = new Date();

        while (current < end) {
            const timeStr = formatHHMM(current);
            const isPast = current < now;
            const isBooked = bookedSet.has(timeStr);

            const isOnLeave = leaves.some((leave) => {
                if (!leave.startTime || !leave.endTime) return true;
                const leaveStart = parseTimeToDate(date, leave.startTime);
                const leaveEnd = parseTimeToDate(date, leave.endTime);
                return current >= leaveStart && current < leaveEnd;
            });

            const available = !isBooked && !isOnLeave && !isPast;
            slots.push({
                time: timeStr,
                available,
                reason: isBooked
                    ? 'Booked'
                    : isOnLeave
                      ? 'Doctor Unavailable'
                      : isPast
                        ? 'Past Time'
                        : 'Available',
            });

            current = new Date(current.getTime() + Number(slotDurationMinutes) * 60000);
        }
        console.log("New Day Slots")
        console.log(slots)
        return res.status(200).json({ success: true, date, slots });
    } catch (error) {
        console.error('Error fetching appointment slots:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Server error',
        });
    }
}


// @ts-ignore
async function bookAppointment(req, res) {
    try {
        const patientId = req.user.id;
        const doctorId = "6a787768d07b93f80e198115";
        const {
            // doctorId,
            appointmentDate,
            startTime,
            endTime,
            type,
            visitPurpose,
        } = req.body;
        // console.log("hello")
        await validateAppointmentSlot(appointmentDate,startTime);
        const appointment = {
            doctorId,
            patientId,
            appointmentDate,
            startTime,
            endTime,
            type: type || 'CHECKUP',
            visitPurpose: visitPurpose || 'NEW_TREATMENT',
        };
        console.log(appointment);
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