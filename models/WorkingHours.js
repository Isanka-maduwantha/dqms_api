const mongoose = require('mongoose');

const WorkingHoursSchema = new mongoose.Schema({
    dayOfWeek: {
        type: String,
        required: true,
    },
    startTime: {
        type: String,
        default: '09:00',
    },
    endTime: {
        type: String,
        default: '22:00',
    },
});

module.exports = mongoose.model('WorkingHours', WorkingHoursSchema);