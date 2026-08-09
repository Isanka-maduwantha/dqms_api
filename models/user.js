const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Name is required"] },
        nic: { type: Number, required: [true, "NIC is required"] },
        phone: { type: String, required: false },
        email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['patient', 'admin', 'dentist', 'receptionist'], default: 'patient' },
        medicalAlerts: { type: [String], default: [] },
    }, // <-- Close the first object (fields) here
    {
        timestamps: true, // <-- This second object holds schema options
    }
);
