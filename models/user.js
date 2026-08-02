// @ts-check
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
        },
        nic: {
            type: Number,
            required: [true, "NIC is required"]
        },
        phone : {
            type: String,
            required : false
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
        },

            nic: {
            type: String,
            required: true,
            unique: true
        },
            phone: {
            type: String,
            required: true
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