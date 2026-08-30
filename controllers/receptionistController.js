const Appointments = require('../models/Appointments');
const User = require('../models/user');
const WorkingHours = require('../models/WorkingHours');
const bcrypt = require('bcrypt');

const {
  validateAppointmentSlot
} = require('../helpers/appointmentValidator');

const {
  parseTimeToDate,
  formatHHMM
} = require('../helpers/timeDateFunctions');

/**
 * Get all registered patients.
 */
/**
 * Search existing patient accounts for Scenario 3.
 * Searches by patient name or Gmail/email address.
 */
exports.searchPatients = async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const patients = await User.find({
      role: 'patient',
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } },
      ],
    })
      .select('_id name phone email nic role')
      .sort({ name: 1 })
      .limit(20)
      .lean();

    return res.status(200).json({ success: true, data: patients });
  } catch (error) {
    console.error('Patient search error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search patients',
    });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({
      role: 'patient'
    }).sort({
      createdAt: -1
    });

    res.status(200).json({
      success: true,
      data: patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve patients'
    });
  }
};

/**
 * Get appointments for a selected date.
 */
exports.getTodayAppointments = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate =
      typeof date === 'string'
        ? date
        : new Date().toISOString().split('T')[0];

    const appointments =
      await Appointments.find({
        appointmentDate: targetDate
      })
        .populate(
          'patientId',
          'name phone email nic age gender address'
        )
        .sort({
          startTime: 1
        });

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve appointments'
    });
  }
};

/**
 * Get the active queue for a selected date.
 *
 * Only appointments that have been checked in
 * and therefore have ARRIVED status are returned.
 */
exports.getQueue = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate =
      typeof date === 'string'
        ? date
        : new Date().toISOString().split('T')[0];

    const queue =
      await Appointments.find({
        appointmentDate: targetDate,
        status: 'ARRIVED',
        tokenNumber: {
          $ne: null
        }
      })
        .populate(
          'patientId',
          'name phone email nic age gender address'
        )
        .sort({
          tokenNumber: 1
        });

    res.status(200).json({
      success: true,
      data: queue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve queue'
    });
  }
};

/**
 * Check in a patient who already has an appointment.
 *
 * BOOKED appointment
 *       ↓
 * receptionist checks in
 *       ↓
 * ARRIVED
 *       ↓
 * token generated
 */
exports.markArrived = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    const appointment =
      await Appointments.findById(
        appointmentId
      ).populate(
        'patientId',
        'name phone email nic age gender address'
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'ARRIVED') {
      return res.status(200).json({
        success: true,
        message:
          'Patient has already been checked in.',
        appointment,
        tokenNumber:
          appointment.tokenNumber
      });
    }

    if (appointment.status !== 'BOOKED') {
      return res.status(400).json({
        success: false,
        message:
          `Appointment cannot be checked in because its current status is ${appointment.status}.`
      });
    }

    const lastTokenAppointment =
      await Appointments.findOne({
        appointmentDate:
          appointment.appointmentDate,
        tokenNumber: {
          $ne: null
        }
      })
        .sort({
          tokenNumber: -1
        })
        .select('tokenNumber');

    const nextTokenNumber =
      lastTokenAppointment &&
      typeof lastTokenAppointment.tokenNumber ===
        'number'
        ? lastTokenAppointment.tokenNumber + 1
        : 1;

    appointment.status = 'ARRIVED';
    appointment.tokenNumber =
      nextTokenNumber;

    await appointment.save();

    const updatedAppointment =
      await Appointments.findById(
        appointment._id
      ).populate(
        'patientId',
        'name phone email nic age gender address'
      );

    return res.status(200).json({
      success: true,
      message:
        'Patient checked in successfully and token generated.',
      tokenNumber:
        nextTokenNumber,
      appointment:
        updatedAppointment
    });
  } catch (error) {
    console.error(
      'Check-in error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to check in patient'
    });
  }
};

/**
 * ============================================================
 * SCENARIO 3
 * ============================================================
 *
 * Make an appointment for an EXISTING patient account
 * from the receptionist dashboard.
 */
exports.bookAppointmentForPatient = async (req, res) => {
  try {
    const { patientId, appointmentDate, startTime, type, visitPurpose } = req.body;

    if (!patientId || !appointmentDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, appointment date and start time are required.',
      });
    }

    const patient = await User.findOne({ _id: patientId, role: 'patient' })
      .select('name phone email nic age gender address role')
      .lean();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient account not found.' });
    }

    await validateAppointmentSlot(appointmentDate, startTime);

    const dateObject = new Date(`${appointmentDate}T00:00:00`);
    const dayName = dateObject.toLocaleDateString('en-US', { weekday: 'long' });
    const schedule = await WorkingHours.findOne({ dayOfWeek: dayName });

    if (!schedule) {
      return res.status(400).json({ success: false, message: `Clinic is closed on ${dayName}.` });
    }

    const slotDuration = Number(schedule.slotDurationMinutes || 15);
    const startDateTime = parseTimeToDate(appointmentDate, startTime);
    const endDateTime = new Date(startDateTime.getTime() + slotDuration * 60000);
    const endTime = formatHHMM(endDateTime);

    const appointment = await Appointments.create({
      patientId: patient._id,
      appointmentDate,
      startTime,
      endTime,
      type: type || 'CHECKUP',
      visitPurpose: visitPurpose || 'NEW_TREATMENT',
      status: 'BOOKED',
      tokenNumber: null,
    });

    const populatedAppointment = await Appointments.findById(appointment._id)
      .populate('patientId', 'name phone email nic age gender address');

    return res.status(201).json({
      success: true,
      message: 'Appointment reserved successfully.',
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error('Receptionist appointment booking error:', error);

    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create appointment.',
    });
  }
};

/**
 * Generate a token for a walk-in patient.
 *
 * This remains separate from the pre-booked
 * appointment check-in flow.
 */
exports.generateWalkInToken =
  async (req, res) => {
    try {
      const {
        name,
        phone,
        nic,
        appointmentDate,
        startTime,
        endTime,
        age,
        gender,
        address
      } = req.body;

      let patient =
        await User.findOne({
          nic
        });

      if (!patient) {
        patient =
          await User.create({
            name,
            nic,
            phone,
            email:
              `${nic || Date.now()}@walkin.local`,
            passwordHash:
              'WALKIN_USER',
            role: 'patient',
            age:
              age || null,
            gender:
              gender || null,
            address:
              address || null
          });
      }

      const walkInAppointment =
        await Appointments.create({
          patientId:
            patient._id,

          appointmentDate:
            appointmentDate ||
            new Date()
              .toISOString()
              .split('T')[0],

          startTime:
            startTime ||
            '09:00',

          endTime:
            endTime ||
            '09:15',

          status:
            'BOOKED'
        });

      const tokenNumber =
        `W-${Math.floor(
          100 +
          Math.random() * 900
        )}`;

      res.status(201).json({
        success: true,
        message:
          'Walk-in token generated successfully',
        token:
          tokenNumber,
        walkInAppointment,
        patient
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate walk-in token'
      });
    }
  };

/**
 * ============================================================
 * SCENARIO 4
 * ============================================================
 *
 * Create a NEW patient account from the receptionist
 * dashboard.
 *
 * Required:
 * - Full name
 * - NIC
 * - Gmail
 * - Password
 *
 * Optional:
 * - Phone
 *
 * Age, gender and address are NOT required for Scenario 4.
 */
exports.addPatient = async (
  req,
  res
) => {
  try {
    const {
      name,
      patientName,
      nic,
      phone,
      email,
      password
    } = req.body;

    const finalName = String(
      name || patientName || ''
    ).trim();

    const finalNic = String(
      nic || ''
    ).trim();

    const finalPhone = String(
      phone || ''
    ).trim();

    const finalEmail = String(
      email || ''
    ).trim().toLowerCase();

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message:
          'Patient full name is required.'
      });
    }

    if (!finalNic) {
      return res.status(400).json({
        success: false,
        message:
          'NIC is required.'
      });
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        message:
          'Gmail address is required.'
      });
    }

    if (
      !finalEmail.endsWith(
        '@gmail.com'
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid Gmail address.'
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters long.'
      });
    }

    const existingNic =
      await User.findOne({
        nic: finalNic
      });

    if (existingNic) {
      return res.status(409).json({
        success: false,
        message:
          'A patient account already exists with this NIC.'
      });
    }

    const existingEmail =
      await User.findOne({
        email: finalEmail
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          'A patient account already exists with this Gmail address.'
      });
    }

    const salt =
      await bcrypt.genSalt(10);

    const passwordHash =
      await bcrypt.hash(
        password,
        salt
      );

    const newPatient =
      await User.create({
        name:
          finalName,

        nic:
          finalNic,

        phone:
          finalPhone,

        email:
          finalEmail,

        passwordHash,

        role:
          'patient'
      });

    const patientResponse = {
      _id:
        newPatient._id,

      name:
        newPatient.name,

      nic:
        newPatient.nic,

      phone:
        newPatient.phone,

      email:
        newPatient.email,

      role:
        newPatient.role
    };

    return res.status(201).json({
      success: true,

      message:
        'Patient account created successfully.',

      newPatient:
        patientResponse
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          'A patient account already exists with the supplied NIC or Gmail address.'
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to create patient account'
    });
  }
};

/**
 * Update a patient account.
 */
exports.updatePatient =
  async (req, res) => {
    try {
      const {
        patientId
      } = req.params;

      const {
        name,
        patientName,
        nic,
        phone,
        email,
        password
      } = req.body;

      const updateData = {};

      if (
        name !== undefined ||
        patientName !== undefined
      ) {
        const finalName =
          String(
            name ||
            patientName ||
            ''
          ).trim();

        if (!finalName) {
          return res.status(400).json({
            success: false,
            message:
              'Patient full name is required.'
          });
        }

        updateData.name =
          finalName;
      }

      if (nic !== undefined) {
        const finalNic =
          String(nic).trim();

        if (!finalNic) {
          return res.status(400).json({
            success: false,
            message:
              'NIC is required.'
          });
        }

        updateData.nic =
          finalNic;
      }

      if (phone !== undefined) {
        updateData.phone =
          String(phone).trim();
      }

      if (email !== undefined) {
        const finalEmail =
          String(email)
            .trim()
            .toLowerCase();

        if (
          !finalEmail.endsWith(
            '@gmail.com'
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Please provide a valid Gmail address.'
          });
        }

        updateData.email =
          finalEmail;
      }

      if (password) {
        if (
          password.length < 8
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Password must be at least 8 characters long.'
          });
        }

        const salt =
          await bcrypt.genSalt(10);

        updateData.passwordHash =
          await bcrypt.hash(
            password,
            salt
          );
      }

      const updated =
        await User.findByIdAndUpdate(
          patientId,
          updateData,
          {
            new: true,
            runValidators: true
          }
        ).select(
          'name nic phone email role'
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message:
            'Patient not found'
        });
      }

      return res.status(200).json({
        success: true,
        updated
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Another patient account already uses this NIC or Gmail address.'
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update patient'
      });
    }
  };

/**
 * Delete a patient account.
 */
exports.deletePatient =
  async (req, res) => {
    try {
      const {
        patientId
      } = req.params;

      const deleted =
        await User.findByIdAndDelete(
          patientId
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            'Patient not found'
        });
      }

      res.status(200).json({
        success: true,
        message:
          'Patient deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete patient'
      });
    }
  };