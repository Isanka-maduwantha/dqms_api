const mongoose = require('mongoose');

const WorkingHoursSchema = new mongoose.Schema({
    dayOfWeek : { 
        type: String,
        required: true,
    },
    startTime : {
        type: String,
        default: '09.00',
    },
    endTime: {
        type: String,
        default: "17:00"
    },
    slotDurationMinutes: {
        type: Number,
        default: 60
    }
})

module.exports = mongoose.model('WorkingHours', WorkingHoursSchema);