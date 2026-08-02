

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
    getSlots
}