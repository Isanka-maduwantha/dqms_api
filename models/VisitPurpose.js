const mongoose = require("mongoose");

const VisitingPurposeSchema = new mongoose.Schema({
    purpose: {
        type : String,
        required: true,
    }
})

module.exports = mongoose.model("VisitPurpose",VisitingPurposeSchema);