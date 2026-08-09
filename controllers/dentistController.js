// controllers/dentistController.js — Module 6: Dentist Surgery Console & Visual Chart
const Appointments = require('../models/Appointments');
const DentalChart = require('../models/DentalChart');
const TreatmentRecord = require('../models/TreatmentRecord');
const User = require('../models/user');
const { deductInventoryForMaterials } = require('./inventoryController');
const { getIO } = require('../config/socket');

// F-6.1: Call Next Patient Trigger
// Marks the dentist's next BOOKED appointment for today as IN_PROGRESS and broadcasts
// the change over Socket.io so the lobby display / receptionist views can react live.
// @ts-ignore
exports.callNextPatient = async (req, res) => {
    try {
        const dentistId = req.user.id;
        const { appointmentId } = req.body; // optional: call a specific patient instead of "next"

        // Free up whatever this dentist was previously seeing
        await Appointments.updateMany(
            { doctorId: dentistId, status: 'IN_PROGRESS' },
            { $set: { status: 'COMPLETED' } }
        );

        const today = new Date().toISOString().slice(0, 10);
        const query = appointmentId
            ? { _id: appointmentId, doctorId: dentistId, status: 'BOOKED' }
            : { doctorId: dentistId, appointmentDate: today, status: 'BOOKED' };

        const appointment = await Appointments.findOne(query).sort({ startTime: 1 });
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'No waiting patients found for this dentist.' });
        }

        appointment.status = 'IN_PROGRESS';
        await appointment.save();

        const patient = await User.findById(appointment.patientId).select('name phone');

        const payload = {
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            patientName: patient?.name,
            startTime: appointment.startTime,
            calledAt: new Date()
        };

        const io = getIO();
        if (io) io.emit('lobby:patientCalled', payload);

        res.status(200).json({ success: true, message: 'Patient called', appointment: payload });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.2: Interactive 32-Teeth SVG Chart — fetch (auto-creates a blank chart on first view)
// @ts-ignore
exports.getDentalChart = async (req, res) => {
    try {
        const { patientId } = req.params;
        let chart = await DentalChart.findOne({ patientId });
        if (!chart) chart = await DentalChart.create({ patientId });
        res.status(200).json({ success: true, chart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.2: Record a condition against a single tooth, keeping a snapshot of the prior state
// @ts-ignore
exports.updateTooth = async (req, res) => {
    try {
        const { patientId, toothNumber } = req.params;
        const { condition, notes } = req.body;
        const toothNum = Number(toothNumber);

        if (toothNum < 1 || toothNum > 32) {
            return res.status(400).json({ success: false, message: 'toothNumber must be between 1 and 32' });
        }

        let chart = await DentalChart.findOne({ patientId });
        if (!chart) chart = await DentalChart.create({ patientId });

        // Keep history of previous tooth charts (F-6.4) before mutating
        chart.history.push({ teeth: chart.teeth, recordedAt: new Date(), recordedBy: req.user.id });

        const tooth = chart.teeth.find(t => t.toothNumber === toothNum);
        if (!tooth) {
            return res.status(404).json({ success: false, message: `Tooth ${toothNum} not found on chart` });
        }
        if (condition) tooth.condition = condition;
        if (notes !== undefined) tooth.notes = notes;
        tooth.updatedAt = new Date();

        await chart.save();
        res.status(200).json({ success: true, message: `Tooth ${toothNum} updated`, chart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.3: Clinical Diagnosis & Note Logger — create a treatment record for the active patient
// @ts-ignore
exports.createTreatmentRecord = async (req, res) => {
    try {
        const dentistId = req.user.id;
        const { patientId, appointmentId, diagnosis, clinicalNotes, procedures, medications, followUpDate } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, message: 'patientId is required' });
        }

        const record = await TreatmentRecord.create({
            patientId,
            dentistId,
            appointmentId,
            diagnosis,
            clinicalNotes,
            procedures,
            medications,
            followUpDate
        });

        res.status(201).json({ success: true, message: 'Treatment record created', record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.3 (cont.) + F-8.1: Update notes/procedures; completing the record with materialsUsed
// triggers the Auto-Inventory Deductor exactly once.
// @ts-ignore
exports.updateTreatmentRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { diagnosis, clinicalNotes, procedures, medications, materialsUsed, followUpDate, status } = req.body;

        const record = await TreatmentRecord.findById(id);
        if (!record) return res.status(404).json({ success: false, message: 'Treatment record not found' });

        if (diagnosis !== undefined) record.diagnosis = diagnosis;
        if (clinicalNotes !== undefined) record.clinicalNotes = clinicalNotes;
        if (procedures !== undefined) record.procedures = procedures;
        if (medications !== undefined) record.medications = medications;
        if (followUpDate !== undefined) record.followUpDate = followUpDate;
        if (materialsUsed !== undefined) record.materialsUsed = materialsUsed;
        if (status !== undefined) record.status = status;

        let lowStockItems = [];
        if (status === 'COMPLETED' && !record.inventoryDeducted && record.materialsUsed.length > 0) {
            lowStockItems = await deductInventoryForMaterials(record.materialsUsed, {
                treatmentRecordId: record._id,
                performedBy: req.user.id
            });
            record.inventoryDeducted = true;
        }

        await record.save();

        if (lowStockItems.length > 0) {
            const io = getIO();
            if (io) io.emit('inventory:lowStock', lowStockItems);
        }

        res.status(200).json({
            success: true,
            message: 'Treatment record updated',
            record,
            lowStockWarnings: lowStockItems
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.4: Patient Medical History Timeline
// @ts-ignore
exports.getPatientHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        const patient = await User.findById(patientId).select('name email phone medicalAlerts');
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

        const [chart, records] = await Promise.all([
            DentalChart.findOne({ patientId }),
            TreatmentRecord.find({ patientId }).sort({ createdAt: -1 }).populate('dentistId', 'name')
        ]);

        res.status(200).json({
            success: true,
            patient,
            medicalAlerts: patient.medicalAlerts,
            dentalChart: chart,
            treatmentTimeline: records
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-6.5: X-Ray / Document Attachment Uploader (Extra)
// @ts-ignore
exports.addAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const record = await TreatmentRecord.findById(id);
        if (!record) return res.status(404).json({ success: false, message: 'Treatment record not found' });

        const attachment = {
            fileName: req.file.originalname,
            fileUrl: `/uploads/xrays/${req.file.filename}`,
            mimeType: req.file.mimetype,
            uploadedAt: new Date()
        };
        record.attachments.push(attachment);
        await record.save();

        res.status(201).json({ success: true, message: 'Attachment uploaded', attachment, record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
