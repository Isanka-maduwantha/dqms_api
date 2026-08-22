// F-6.2: Interactive 32-Teeth SVG Chart
// Stores the current condition of each of the 32 adult teeth for a patient,
// plus a snapshot history so the dentist can see how the chart changed over time.
const mongoose = require('mongoose');

const TOOTH_CONDITIONS = ['HEALTHY', 'CAVITY', 'FILLING', 'CROWN', 'ROOT_CANAL', 'EXTRACTED', 'MISSING', 'OTHER'];

const ToothSchema = new mongoose.Schema({
    toothNumber: { type: Number, required: true, min: 1, max: 32 }, // Universal numbering 1-32
    condition: { type: String, enum: TOOTH_CONDITIONS, default: 'HEALTHY' },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const ChartSnapshotSchema = new mongoose.Schema({
    teeth: [ToothSchema],
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // dentist who made the change
}, { _id: false });

const DentalChartSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    teeth: {
        type: [ToothSchema],
        default: () => Array.from({ length: 32 }, (_, i) => ({ toothNumber: i + 1, condition: 'HEALTHY' }))
    },
    history: { type: [ChartSnapshotSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('DentalChart', DentalChartSchema);
module.exports.TOOTH_CONDITIONS = TOOTH_CONDITIONS;
