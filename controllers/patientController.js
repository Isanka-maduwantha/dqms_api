const Appointments = require('../models/Appointments');
const { validateAppointmentSlot } = require('../helpers/appointmentValidator');
// @ts-ignore
async function getUpcomingAppointments(req, res) {
    try {
        const patientid = req.user.id;
console.log(patientid)
        const upAppointments = await Appointments.find({
            patientId: patientid
        })

        return res.status(200).json({
            Success: true,
            message: "Upcoming Appointments ",
            upcomingAppointments: upAppointments
        })
        
    } catch (error) {
        res.json({
            "error": error
        })
    }


}
//  @ts-ignore
async function cancelAppointment(req, res) {
    try {
        const userId = req.user.id;
        console.log(userId);
        const { _id } = req.body;
        const appointment = await Appointments.findOne({
            _id: _id,
            patientId: userId,
            status: 'BOOKED'
        })
        console.log(appointment)
        if (!appointment) {
            return res.status(404).json({
                success: false,
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
// @ts-ignore
async function rescheduleAppointment(req, res) {
    try {
        const userId = req.user;
        const { _id, appointmentDate, startTime, endTime } = req.body;
        await validateAppointmentSlot(appointmentDate,startTime);
        // const isAppointmentExist = await Appointments.findOne({
        //     appointmentDate,
        //     startTime,
        // });

        // if (isAppointmentExist) {
        //     return res.status(400).json({
        //         error: 'Appointment already exists At The Selected Time Choose Another',
        //     });
        // }

        const appointment = await Appointments.findOneAndUpdate(
            { _id: _id },
            {
                $set: {
                    appointmentDate: appointmentDate,
                    startTime: startTime,
                    endTime: endTime,
                    status: "BOOKED"
                }
            },
            { returnDocument: 'after' }

        )
        if (!appointment) {
            return res.status(400).json({
                "error": "Appointment does not Exist"
            }
            )
        }
        return res.status(201).json({
            success: true,
            "message": "Appointment Rescheduled Successfully",
            "appointment":appointment
        })

    } catch (error) {
        // @ts-ignore
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            // @ts-ignore
            message: error.message || 'Internal Server Error',
        });
    }
}
async function getPatientHistory(req, res) {

}
module.exports = { getUpcomingAppointments, rescheduleAppointment, cancelAppointment, getPatientHistory }