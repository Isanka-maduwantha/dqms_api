// @ts-check
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['patient', 'admin', 'dentist','receptionist'],
            default: 'patient',
        }

    },
    { timestamps: true}
)
const User = mongoose.model('User', userSchema);
module.exports = User;