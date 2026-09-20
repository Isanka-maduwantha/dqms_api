const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    relationship: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

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
      default: '',
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
      enum: ['patient', 'admin', 'dentist', 'receptionist'],
      default: 'patient',
    },

    // Shared personal profile information.
    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ['', 'male', 'female', 'other', 'prefer_not_to_say'],
      default: '',
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },

    // Patient medical/profile information. Clinical history and dental charts
    // remain in the dedicated clinical modules.
    bloodGroup: {
      type: String,
      enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: '',
    },

    allergies: {
      type: [String],
      default: [],
    },

    medicalConditions: {
      type: [String],
      default: [],
    },

    medications: {
      type: [String],
      default: [],
    },

    insuranceProvider: {
      type: String,
      trim: true,
      default: '',
    },

    insuranceNumber: {
      type: String,
      trim: true,
      default: '',
    },

    // Staff employment information.
    employeeId: {
      type: String,
      trim: true,
      default: '',
    },

    jobTitle: {
      type: String,
      trim: true,
      default: '',
    },

    department: {
      type: String,
      trim: true,
      default: '',
    },

    branch: {
      type: String,
      trim: true,
      default: '',
    },

    joiningDate: {
      type: Date,
      default: null,
    },

    employmentStatus: {
      type: String,
      enum: ['', 'active', 'on_leave', 'inactive'],
      default: '',
    },

    // Dentist professional information.
    professionalRegistrationNumber: {
      type: String,
      trim: true,
      default: '',
    },

    qualifications: {
      type: String,
      trim: true,
      default: '',
    },

    specialization: {
      type: String,
      trim: true,
      default: '',
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
      default: null,
    },

    languages: {
      type: [String],
      default: [],
    },

    professionalBio: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model('User', userSchema);

module.exports = User;
