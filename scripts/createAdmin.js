const dns = require('node:dns');

// Use the same DNS servers as the main application.
dns.setServers([
    '8.8.8.8',
    '1.1.1.1',
]);

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/user');
const env = require('../config/env');


async function createAdmin() {
    try {
        console.log('======================================');
        console.log('Creating first administrator');
        console.log('======================================');

        console.log('DNS servers configured:');
        console.log('8.8.8.8');
        console.log('1.1.1.1');

        console.log('');
        console.log('Connecting to MongoDB...');

        await mongoose.connect(env.CONNECTION_URL);

        console.log('MongoDB connected successfully.');

        const email = 'admin@gmail.com';
        const password = 'Admin@123';

        /*
         * Check if the email already exists.
         */
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });

        if (existingUser) {
            if (existingUser.role === 'admin') {
                console.log('');
                console.log('Admin account already exists.');
                console.log('--------------------------------------');
                console.log(`Name:  ${existingUser.name}`);
                console.log(`Email: ${existingUser.email}`);
                console.log(`Role:  ${existingUser.role}`);
                console.log(`ID:    ${existingUser._id}`);
                console.log('--------------------------------------');

                await mongoose.disconnect();

                process.exit(0);
            }

            console.log('');
            console.log(
                'A user already exists with this email, '
                + 'but the role is not admin.'
            );

            console.log(`Email: ${existingUser.email}`);
            console.log(`Role: ${existingUser.role}`);

            await mongoose.disconnect();

            process.exit(1);
        }

        /*
         * Hash password before storing it.
         */
        console.log('Hashing administrator password...');

        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        /*
         * Create the administrator.
         */
        console.log('Creating administrator account...');

        const admin = await User.create({
            name: 'Administrator',
            nic: 'ADMIN-001',
            phone: '',
            email: email.toLowerCase(),
            passwordHash,
            role: 'admin',
        });

        console.log('');
        console.log('======================================');
        console.log('ADMIN ACCOUNT CREATED SUCCESSFULLY');
        console.log('======================================');
        console.log(`Name:     ${admin.name}`);
        console.log(`Email:    ${admin.email}`);
        console.log(`Password: ${password}`);
        console.log(`Role:     ${admin.role}`);
        console.log(`ID:       ${admin._id}`);
        console.log('======================================');

        await mongoose.disconnect();

        console.log('');
        console.log('MongoDB connection closed.');

        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('======================================');
        console.error('FAILED TO CREATE ADMIN');
        console.error('======================================');
        console.error(error);

        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error(
                'Could not close MongoDB connection:',
                disconnectError
            );
        }

        process.exit(1);
    }
}


createAdmin();