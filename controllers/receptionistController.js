const VisitPurpose = require("../models/VisitPurpose");

const Appointments = require('../models/Appointments');
const User = require('../models/user');
const WorkingHours = require('../models/WorkingHours');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const DentalTreatment = require('../models/DentalTreatment');

const {
  validateAppointmentPeriod,
  allocateAppointmentNumber,
  allocateQueueToken,
  getPeriodConfig,
  getClinicTodayKey,
} = require('../helpers/appointmentPeriods');



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
        { nic: { $regex: escapedQuery, $options: 'i' } },
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
    const targetDate = typeof date === 'string' ? date : getClinicTodayKey();

    const appointments = await Appointments.find({ appointmentDate: targetDate })
      .populate('patientId', 'name phone email nic age gender address')
      .sort({
        isPriority: -1,
        startTime: 1,
        appointmentNumber: 1,
        tokenNumber: 1,
        createdAt: 1,
      });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to retrieve appointments' });
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
    const targetDate = typeof date === 'string' ? date : getClinicTodayKey();

    const queue = await Appointments.find({
      appointmentDate: targetDate,
      status: 'ARRIVED',
      tokenNumber: { $ne: null },
    })
      .populate('patientId', 'name phone email nic age gender address')
      .sort({ isPriority: -1, priorityMarkedAt: 1, tokenNumber: 1 });

    return res.status(200).json({ success: true, data: queue });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to retrieve queue' });
  }
};

/**
 * Check in a patient who already has an appointment.
 *
 * BOOKED appointment
 *       ↓
 * receptionist clicks Check In
 *       ↓
 * receptionist selects Visit Purpose
 *       ↓
 * ARRIVED + queue token + visit purpose
 *
 * Billing is NOT created here.
 *
 * If the purpose is NEW_TREATMENT, the dentist completes the
 * treatment first. The invoice is then created by the dentist's
 * end-treatment flow.
 */
exports.markArrived = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { visitPurpose } = req.body || {};

    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid appointment ID is required.',
      });
    }

    const normalizedPurpose = String(visitPurpose || '')
      .trim()
      .toUpperCase();

    const allowedPurposes = [
      'NEW_TREATMENT',
      'FOLLOW_UP',
      'CHECKUP_SCREENING',
    ];

    if (!allowedPurposes.includes(normalizedPurpose)) {
      return res.status(400).json({
        success: false,
        message:
          'Visit purpose is required and must be NEW_TREATMENT, FOLLOW_UP, or CHECKUP_SCREENING.',
      });
    }

    const appointment = await Appointments.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    if (appointment.status === 'ARRIVED') {
      const populated = await Appointments.findById(appointment._id)
        .populate('patientId', 'name phone email nic age gender address')
        .populate('treatmentTypeId', 'code name category description price');

      return res.status(200).json({
        success: true,
        message: 'Patient has already been checked in.',
        tokenNumber: appointment.tokenNumber,
        visitPurpose: appointment.visitPurpose,
        appointment: populated,
      });
    }

    if (appointment.status !== 'BOOKED') {
      return res.status(400).json({
        success: false,
        message: `Appointment cannot be checked in because its current status is ${appointment.status}.`,
      });
    }

    let updatedAppointment = null;
    let nextTokenNumber = null;

    for (let attempt = 0; attempt < 8 && !updatedAppointment; attempt += 1) {
      nextTokenNumber = await allocateQueueToken(
        appointment.appointmentDate,
      );

      try {
        updatedAppointment = await Appointments.findOneAndUpdate(
          {
            _id: appointmentId,
            status: 'BOOKED',
            tokenNumber: null,
          },
          {
            $set: {
              status: 'ARRIVED',
              tokenNumber: nextTokenNumber,
              visitPurpose: normalizedPurpose,
            },
          },
          { new: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }

    if (!updatedAppointment) {
      return res.status(409).json({
        success: false,
        message:
          'Check-in was updated by another receptionist. Please refresh the queue.',
      });
    }

    const populatedAppointment = await Appointments.findById(
      updatedAppointment._id,
    )
      .populate('patientId', 'name phone email nic age gender address')
      .populate('treatmentTypeId', 'code name category description price');

    return res.status(200).json({
      success: true,
      message:
        normalizedPurpose === 'NEW_TREATMENT'
          ? 'Patient checked in successfully. Token generated. Invoice will be created after the dentist completes the treatment.'
          : 'Patient checked in successfully and token generated. No invoice will be created for this visit purpose.',
      tokenNumber: nextTokenNumber,
      visitPurpose: normalizedPurpose,
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error('Check-in error:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to check in patient.',
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
    const { patientId, appointmentDate, appointmentPeriod, appointmentCategory, treatmentTypeId, type, visitPurpose } = req.body || {};
    if (!patientId || !appointmentDate || !appointmentPeriod) {
      return res.status(400).json({ success: false, message: 'Patient ID, appointment date and appointment period are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(patientId)) return res.status(400).json({ success: false, message: 'Invalid patient ID.' });

    const patient = await User.findOne({ _id: patientId, role: 'patient' }).select('name phone email nic age gender address role').lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient account not found.' });

    let treatment = null;
    if (treatmentTypeId !== undefined && treatmentTypeId !== null && treatmentTypeId !== '') {
      if (!mongoose.Types.ObjectId.isValid(treatmentTypeId)) return res.status(400).json({ success: false, message: 'Invalid treatment type ID.' });
      treatment = await DentalTreatment.findOne({ _id: treatmentTypeId, isActive: true }).select('_id code name category description price').lean();
      if (!treatment) return res.status(404).json({ success: false, message: 'Selected treatment type was not found or is inactive.' });
    }

    const legacyType = String(type || '').trim().toUpperCase();
    const categoryFromLegacyType = {
      CHECKUP: 'ROUTINE_CHECKUP',
      NEW_PATIENT: 'NEW_PATIENT_REGISTRATION',
      OTHER: 'SPECIALIST_OTHER_PURPOSE',
      EMERGENCY: 'SPECIALIST_OTHER_PURPOSE',
      ARRIVED: 'SPECIALIST_OTHER_PURPOSE',
    }[legacyType];
    const normalizedCategory = String(appointmentCategory || categoryFromLegacyType || '').trim().toUpperCase();
    const allowedCategories = ['ROUTINE_CHECKUP', 'NEW_PATIENT_REGISTRATION', 'SPECIALIST_OTHER_PURPOSE'];
    if (!allowedCategories.includes(normalizedCategory)) return res.status(400).json({ success: false, message: 'Invalid appointment category.' });

    const normalizedType = ['CHECKUP', 'ARRIVED', 'NEW_PATIENT', 'EMERGENCY', 'OTHER'].includes(legacyType) ? legacyType : 'CHECKUP';
    const normalizedPurpose = String(visitPurpose || 'NEW_TREATMENT').trim().toUpperCase();
    const allowedPurposes = ['NEW_TREATMENT', 'FOLLOW_UP', 'CHECKUP_SCREENING'];
    if (!allowedPurposes.includes(normalizedPurpose)) return res.status(400).json({ success: false, message: 'Invalid visit purpose.' });

    const validation = await validateAppointmentPeriod(appointmentDate, appointmentPeriod);
    const period = validation.period;
    const config = getPeriodConfig(period);
    let appointment = null;
    let appointmentNumber = null;

    for (let attempt = 0; attempt < 8 && !appointment; attempt += 1) {
      appointmentNumber = await allocateAppointmentNumber(appointmentDate, period);
      try {
        appointment = await Appointments.create({
          patientId: patient._id,
          appointmentDate,
          appointmentPeriod: period,
          appointmentNumber,
          appointmentCategory: normalizedCategory,
          treatmentTypeId: treatment?._id || null,
          startTime: config.startTime,
          endTime: config.endTime,
          type: normalizedType,
          visitPurpose: normalizedPurpose,
          status: 'BOOKED',
          tokenNumber: null,
          isPriority: false,
          priorityType: null,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }

    if (!appointment) return res.status(409).json({ success: false, message: 'This appointment period was just updated. Please try again.' });
    const populatedAppointment = await Appointments.findById(appointment._id)
      .populate('patientId', 'name phone email nic age gender address')
      .populate('treatmentTypeId', 'code name category description price');
    return res.status(201).json({ success: true, message: 'Appointment reserved successfully.', appointment: populatedAppointment, appointmentNumber, appointmentPeriod: period });
  } catch (error) {
    console.error('Receptionist appointment booking error:', error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to create appointment.' });
  }
};

/**
 * Generate a token for a walk-in patient.
 *
 * This remains separate from the pre-booked
 * appointment check-in flow.
 */
exports.generateWalkInToken = async (req, res) => {
  try {
    const { name, phone, nic, appointmentDate, appointmentPeriod, age, gender, address, emergency } = req.body;
    let patient = await User.findOne({ nic });

    if (!patient) {
      patient = await User.create({
        name, nic, phone, email: `${nic || Date.now()}@walkin.local`, passwordHash: 'WALKIN_USER', role: 'patient',
        age: age || null, gender: gender || null, address: address || null,
      });
    }

    const date = appointmentDate || getClinicTodayKey();
    const nextToken = await allocateQueueToken(date);
    const isPriority = Boolean(emergency);
    const walkInAppointment = await Appointments.create({
      patientId: patient._id, appointmentDate: date, appointmentPeriod: appointmentPeriod || null,
      appointmentNumber: null, startTime: null, endTime: null, status: 'ARRIVED', tokenNumber: nextToken,
      type: isPriority ? 'EMERGENCY' : 'OTHER',
      // Walk-in patients enter the queue immediately. Preserve the
      // existing walk-in behavior by treating them as new-treatment
      // visits unless a future walk-in purpose selector is introduced.
      visitPurpose: 'NEW_TREATMENT',
      isPriority,
      priorityType: isPriority ? 'EMERGENCY' : null,
      priorityMarkedAt: isPriority ? new Date() : null,
    });

    return res.status(201).json({ success: true, message: isPriority ? 'Emergency patient added to priority queue.' : 'Walk-in patient added to queue.', token: nextToken, tokenNumber: nextToken, walkInAppointment, patient });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to generate walk-in token' });
  }
};

/**
 * Mark an existing appointment as receptionist-controlled emergency priority.
 */
exports.markEmergencyPriority = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointments.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) return res.status(400).json({ success: false, message: `Cannot prioritize an appointment with status ${appointment.status}.` });

    appointment.isPriority = true;
    appointment.priorityType = 'EMERGENCY';
    appointment.priorityMarkedAt = new Date();
    appointment.priorityMarkedBy = req.user.id;
    if (appointment.type !== 'EMERGENCY') appointment.type = 'EMERGENCY';
    await appointment.save();

    const populated = await Appointments.findById(appointment._id)
      .populate('patientId', 'name phone email nic age gender address')
      .populate('priorityMarkedBy', 'name email role');

    return res.status(200).json({ success: true, message: 'Patient has been marked as emergency priority.', appointment: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to mark emergency priority.' });
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

exports.getVisitPurposeList = async (req, res) => {
  try {
    const visitPurposelist = await VisitPurpose.find();
    if (visitPurposelist != null) {
      return res.status(200).json({
        success: true,
        message: "Visit Purpose list Loaded Successfully",
        purposeList: visitPurposelist,
      })
    } 

    return res.status(404).json({
        success: false,
        message: "Visit Purpose list Empty",
        purposeList: [],
      })

  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
        success: false,
        message: "Server Error",
      })
  }
}