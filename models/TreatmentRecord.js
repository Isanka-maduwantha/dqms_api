// F-6.3: Clinical Diagnosis & Note Logger
// F-6.4: feeds the Patient Medical History Timeline
// F-6.5: X-Ray / Document Attachment Uploader (Extra)
const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, default: '' },
    instructions: { type: String, default: '' }
}, { _id: false });

// Materials consumed for this treatment (feeds Module 8 auto-inventory deduction)
const MaterialUsedSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    itemName: { type: String, required: true },
    quantityUsed: { type: Number, required: true, min: 1 }
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const TreatmentRecordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dentistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    diagnosis: { type: String, default: '' },
    clinicalNotes: { type: String, default: '' },
    procedures: { type: [String], default: [] },
    medications: { type: [MedicationSchema], default: [] },
    materialsUsed: { type: [MaterialUsedSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    followUpDate: { type: String, default: null }, // 'YYYY-MM-DD'
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
    inventoryDeducted: { type: Boolean, default: false } // guards against double-deducting stock
}, { timestamps: true });

module.exports = mongoose.model('TreatmentRecord', TreatmentRecordSchema);
