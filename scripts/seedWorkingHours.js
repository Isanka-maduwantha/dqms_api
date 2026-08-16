const env = require('../config/env');
const dbConnection = require('../config/db');
const seedWorkingHours = require('../public/dummydata');

async function run() {
    try {
        await dbConnection();

        await seedWorkingHours();

        console.log('Working hours seeded successfully.');

        process.exit(0);
    } catch (error) {
        console.error(
            'Failed to seed working hours:',
            error
        );

        process.exit(1);
    }
}

run();