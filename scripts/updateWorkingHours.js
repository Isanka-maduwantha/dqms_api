const dns = require('node:dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const dbConnection = require('../config/db');
const WorkingHours = require('../models/WorkingHours');

async function run() {
    try {
        await dbConnection();

        const days = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
        ];

        for (const day of days) {
            await WorkingHours.findOneAndUpdate(
                { dayOfWeek: day },
                {
                    dayOfWeek: day,
                    startTime: '09:00',
                    endTime: '22:00',
                    slotDurationMinutes: 15
                },
                {
                    upsert: true,
                    returnDocument: 'after'
                }
            );

            console.log(`${day}: 09:00 - 22:00`);
        }

        console.log('Working hours updated successfully.');

        process.exit(0);
    } catch (error) {
        console.error(
            'Failed to update working hours:',
            error
        );

        process.exit(1);
    }
}

run();