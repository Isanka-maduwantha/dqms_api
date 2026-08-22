const User = require('../models/user');
const env = require('../config/env');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;
        console.log(email, password);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and Password are required' });
        }

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(401).json({ message: 'Invalid Email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, existingUser.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        const token = jwt.sign(
            {
                id: existingUser.id,
                email: existingUser.email,
                role: existingUser.role
            },
            env.JWT_SECRET || "some-long-random-secret",
            { expiresIn: '1d' }
        );
        console.log(token);
        return res.status(200).json({
            message: 'Login Successful',
            token,
            user: {
                id: existingUser.id,
                email: existingUser.email,
                role: existingUser.role,
            },
        });
    } catch (error) {
        console.error('Login Error', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function registerUser(req, res) {
    try {
        const { name, nic, phone, email, password, role } = req.body;
        console.log(req.body);
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            name,
            nic,
            phone,
            email,
            passwordHash,
            role: role || "patient",
        });

        res.status(201).json({
            message: "User Created Successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt,
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to insert user',
            error: /** @type {any} */ (error).message
        });
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function registerReceptionist(req, res) {
    try {
        const { name, nic, phone, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newReceptionist = await User.create({
            name,
            nic,
            phone,
            email,
            passwordHash,
            role: "receptionist", // Force role here
        });

        res.status(201).json({
            message: "Receptionist Registered Successfully",
            user: {
                id: newReceptionist._id,
                name: newReceptionist.name,
                email: newReceptionist.email,
                role: newReceptionist.role,
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to register receptionist',
            error: /** @type {any} */ (error).message
        });
    }
}

module.exports = {
    login,
    registerUser,
    registerReceptionist
};