const Appointments = require('../models/Appointments');

// @ts-ignore
async function getUpcomingAppointments(req, res) {
    try {
        const patientid = req.user.userId;
        const upAppointments = await Appointments.find({
            patientId: patientid
        })

        return res.status(200).json({
            Success: true,
            message: "Upcoming Appointments ",
            upcomingAppointments: upAppointments
        })
        console.log(patientid)
    } catch (error) {
        res.json({
            "error": error
        })
    }


}
async function getPatientHistory(req, res) {

}
module.exports = { getUpcomingAppointments, getPatientHistory }