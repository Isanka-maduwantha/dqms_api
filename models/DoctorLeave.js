const mongoose = require('mongoose')

const DoctorLeaveSchema = new mongoose.Schema(
    {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        leaveDate: { type: String,  required:true },
        startDate: { type: String, default: null },
        endTime: { type: String, default: null },
        reason: { type: String }
    }
);

module.exports = mongoose.model('DoctorLeave', DoctorLeaveSchema);