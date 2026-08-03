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
//  @ts-ignore
async function cancelAppointment(req,res){
    try{
        const userId = req.user.userId;
        console.log(userId);
        const { _id } = req.body;
        const appointment = await Appointments.findOne({
            _id: _id,
            patientId: userId,
            status: 'BOOKED'
        })
        console.log(appointment)
        if(!appointment){
            return res.status(404).json({
                success:false,
                message: "Appointment not found , already cancelled, or unauthorized"
            })
        }
        
        appointment.status = "CANCELLED";
        const savedAppointment = await appointment.save();
        console.log(savedAppointment);

       return res.status(200).json({
        success: true,
        message: "Appointment Cancelled Successfully"
       })

    } catch (error) {
        console.log(error)
    }
}
async function getPatientHistory(req, res) {

}
module.exports = { getUpcomingAppointments,cancelAppointment, getPatientHistory }