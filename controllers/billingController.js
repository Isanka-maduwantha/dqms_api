const mongoose = require('mongoose');
const { getPatientBilling, recordPayment } = require('./billingService');
const User = require('../models/user');
const Invoice = require('../models/Invoice');

exports.getPatientBilling = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID.',
      });
    }

    const patient = await User.findOne({
      _id: patientId,
      role: 'patient',
    }).select('_id name phone email nic').lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    const billing = await getPatientBilling(patientId);

    return res.status(200).json({
      success: true,
      patient,
      ...billing,
    });
  } catch (error) {
    console.error('Get patient billing error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve patient billing.',
    });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID.' });
    }

    const invoice = await Invoice.findById(invoiceId)
      .populate('patientId', 'name phone email nic')
      .populate('appointmentId', 'appointmentDate startTime endTime status visitPurpose')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    return res.status(200).json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve invoice.',
    });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const receivedBy = req.user?.id;
    const { patientId, invoiceId } = req.params;
    const { amount, method = 'CASH', notes = '' } = req.body || {};

    if (!receivedBy) {
      return res.status(401).json({ success: false, message: 'Authenticated receptionist information is missing.' });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId) || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient or invoice ID.' });
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a number greater than 0.' });
    }

    const normalizedMethod = String(method).trim().toUpperCase();
    const allowedMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'];

    if (!allowedMethods.includes(normalizedMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be CASH, CARD, BANK_TRANSFER, ONLINE or OTHER.',
      });
    }

    const result = await recordPayment({
      invoiceId,
      patientId,
      amount,
      method: normalizedMethod,
      notes,
      receivedBy,
    });

    return res.status(201).json({
      success: true,
      message: result.invoice.status === 'PAID'
        ? 'Payment recorded. Invoice is fully paid.'
        : 'Payment recorded successfully.',
      payment: result.payment,
      invoice: result.invoice,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record payment.',
    });
  }
};


/**
 * ==========================================================
 * GET PATIENT BILLING
 * ==========================================================
 *
 * GET /api/receptionist/patients/:patientId/billing
 *
 * Returns:
 * - Patient
 * - Invoices
 * - Payments
 * - Billing totals
 *
 * ==========================================================
 */
exports.getPatientBilling = async (
  req,
  res,
) => {
  try {
    const { patientId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        patientId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid patient ID.',
      });
    }

    const patient =
      await User.findOne({
        _id: patientId,
        role: 'patient',
      })
        .select(
          '_id name phone email nic',
        )
        .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          'Patient not found.',
      });
    }

    const billing =
      await getPatientBilling(
        patientId,
      );

    return res.status(200).json({
      success: true,
      patient,
      ...billing,
    });
  } catch (error) {
    console.error(
      'Get patient billing error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve patient billing.',
    });
  }
};


/**
 * ==========================================================
 * GET PATIENT OVERVIEW
 * ==========================================================
 *
 * GET /api/receptionist/patients/:patientId/overview
 *
 * This is the main receptionist patient screen.
 *
 * Returns:
 *
 * PATIENT
 * -------
 * - name
 * - NIC
 * - phone
 * - email
 *
 * TREATMENT HISTORY
 * -----------------
 * - treatment name
 * - treatment price
 * - treatment date
 * - follow-up date
 * - diagnosis
 * - treatment details
 * - notes
 * - dentist
 * - materials used
 *
 * BILLING
 * -------
 * - invoices
 * - invoice totals
 * - payments
 * - outstanding balances
 *
 * IMPORTANT:
 * Treatment price is the price stored in the treatment
 * record. Inventory prices are NOT used here.
 *
 * ==========================================================
 */
exports.getPatientOverview = async (
  req,
  res,
) => {
  try {
    const { patientId } =
      req.params;

    /**
     * ========================================================
     * VALIDATE PATIENT ID
     * ========================================================
     */
    if (
      !mongoose.Types.ObjectId.isValid(
        patientId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid patient ID.',
      });
    }

    /**
     * ========================================================
     * GET PATIENT
     * ========================================================
     */
    const patient =
      await User.findOne({
        _id: patientId,
        role: 'patient',
      })
        .select(
          '_id name phone email nic',
        )
        .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          'Patient not found.',
      });
    }

    /**
     * ========================================================
     * GET DENTAL CHART / TREATMENT HISTORY
     * ========================================================
     *
     * Populate:
     *
     * - dentist
     * - appointment
     */
    const dentalChart =
      await DentalChart.findOne({
        patientId:
          patient._id,
      })
        .populate(
          'treatmentRecords.dentistId',
          'name email role',
        )
        .populate(
          'treatmentRecords.appointmentId',
          'appointmentDate startTime endTime type visitPurpose status tokenNumber',
        )
        .lean();

    const treatmentRecords =
      dentalChart?.treatmentRecords ||
      [];

    /**
     * ========================================================
     * GET BILLING
     * ========================================================
     *
     * Reuse the existing billing service.
     *
     * This already returns:
     *
     * - invoices
     * - payments
     * - totals
     */
    const billing =
      await getPatientBilling(
        patientId,
      );

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */
    return res.status(200).json({
      success: true,

      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        nic: patient.nic,
      },

      treatmentHistory: {
        dentalChartId:
          dentalChart?._id ||
          null,

        count:
          treatmentRecords.length,

        records:
          treatmentRecords,
      },

      billing: {
        invoices:
          billing.invoices,

        totals:
          billing.totals,
      },
    });
  } catch (error) {
    console.error(
      'Get patient overview error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve patient overview.',
    });
  }
};


/**
 * ==========================================================
 * GET SINGLE INVOICE
 * ==========================================================
 */
exports.getInvoice = async (
  req,
  res,
) => {
  try {
    const { invoiceId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        invoiceId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid invoice ID.',
      });
    }

    const invoice =
      await Invoice.findById(
        invoiceId,
      )
        .populate(
          'patientId',
          'name phone email nic',
        )
        .populate(
          'appointmentId',
          'appointmentDate startTime endTime status visitPurpose',
        )
        .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message:
          'Invoice not found.',
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error(
      'Get invoice error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve invoice.',
    });
  }
};


/**
 * ==========================================================
 * RECORD PAYMENT
 * ==========================================================
 */
exports.recordPayment = async (
  req,
  res,
) => {
  try {
    const receivedBy =
      req.user?.id;

    const {
      patientId,
      invoiceId,
    } = req.params;

    const {
      amount,
      method = 'CASH',
      notes = '',
    } = req.body || {};

    if (!receivedBy) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated receptionist information is missing.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        patientId,
      ) ||
      !mongoose.Types.ObjectId.isValid(
        invoiceId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid patient or invoice ID.',
      });
    }

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Payment amount must be a number greater than 0.',
      });
    }

    const normalizedMethod =
      String(method)
        .trim()
        .toUpperCase();

    const allowedMethods = [
      'CASH',
      'CARD',
      'BANK_TRANSFER',
      'ONLINE',
      'OTHER',
    ];

    if (
      !allowedMethods.includes(
        normalizedMethod,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Payment method must be CASH, CARD, BANK_TRANSFER, ONLINE or OTHER.',
      });
    }

    const result =
      await recordPayment({
        invoiceId,
        patientId,
        amount,
        method:
          normalizedMethod,
        notes,
        receivedBy,
      });

    return res.status(200).json({
      success: true,
      message:
        'Payment recorded successfully.',
      payment:
        result.payment,
      invoice:
        result.invoice,
    });
  } catch (error) {
    console.error(
      'Record payment error:',
      error,
    );

    const statusCode =
      error?.statusCode || 500;

    return res
      .status(statusCode)
      .json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to record payment.',
      });
  }
};
