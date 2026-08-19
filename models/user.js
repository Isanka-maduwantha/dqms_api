const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    nic: {
      type: String,
      required: [true, 'NIC is required'],
      unique: true,
      trim: true,
    },

    phone: {
      type: String,
      required: false,
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        'patient',
        'admin',
        'dentist',
        'receptionist',
      ],
      default: 'patient',
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model(
  'User',
  userSchema,
);

module.exports = User;