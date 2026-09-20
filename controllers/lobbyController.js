const Appointments = require('../models/Appointments');
const { getClinicTodayKey } = require('../helpers/appointmentPeriods');

async function getLobbyData(req, res) {
    const requestedDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const today = requestedDate || getClinicTodayKey();

    try {
        const queueAppointments = await Appointments.find({
            appointmentDate: today,
            status: 'ARRIVED',
            tokenNumber: { $type: 'number' },
        })
            .populate('patientId', 'name phone')
            .lean();

        const sortedAppointments = queueAppointments.sort((a, b) => {
            if (Boolean(a.isPriority) !== Boolean(b.isPriority)) {
                return a.isPriority ? -1 : 1;
            }

            if (a.isPriority && b.isPriority) {
                const priorityA = a.priorityMarkedAt ? new Date(a.priorityMarkedAt).getTime() : Number.MAX_SAFE_INTEGER;
                const priorityB = b.priorityMarkedAt ? new Date(b.priorityMarkedAt).getTime() : Number.MAX_SAFE_INTEGER;
                if (priorityA !== priorityB) return priorityA - priorityB;
            }

            return (a.tokenNumber || Number.MAX_SAFE_INTEGER) - (b.tokenNumber || Number.MAX_SAFE_INTEGER);
        });

        return res.status(200).json({
            success: true,
            date: today,
            data: sortedAppointments,
        });
    } catch (err) {
        console.error('Error fetching lobby data:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

module.exports = getLobbyData;
