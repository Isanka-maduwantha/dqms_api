const mongoose = require('mongoose');
const Appointments = require('../models/Appointments');

async function getLobbyData(req, res) {
    // Get Today's Date in 'YYYY-MM-DD' format matching your DB strings
    const today = new Date('2026-08-30').toISOString().split('T')[0];
    console.log("Fetching appointments for date:", today);

    try {
        // 1. Fetch all appointments where date is Today
        const upAppointments = await Appointments.find({
            appointmentDate: today
        });

        // 2. Helper function to group times into 3h slots (9, 12, 15, 18)
        const getSlotGroup = (timeStr) => {
            if (!timeStr) return 99; // Fallback for missing times
            const hour = parseInt(timeStr.split(':')[0], 10);

            if (hour >= 9 && hour < 12) return 9;
            if (hour >= 12 && hour < 15) return 12;
            if (hour >= 15 && hour < 18) return 15;
            if (hour >= 18) return 18;
            return hour; // Keeps early morning appointments (e.g. 8 AM) before 9 AM
        };

        // 3. Sort the array using the slot system and createdAt timestamps
        // Using Mongoose's .toObject() or spread because Mongoose arrays don't have .toSorted() yet
        const sortedAppointments = [...upAppointments].sort((a, b) => {
            const slotA = getSlotGroup(a.startTime);
            const slotB = getSlotGroup(b.startTime);

            // Primary sort: By 3-hour slot priority
            if (slotA !== slotB) {
                return slotA - slotB;
            }

            // Secondary sort: By createdAt time (Oldest/First created comes first)
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // 4. Send the sorted data back to the client
        res.status(200).json({
            success: true,
            data: sortedAppointments
        });

    } catch (err) {
        console.error("Error fetching lobby data:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = getLobbyData;
