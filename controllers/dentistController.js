const mongoose = require('mongoose');

const Appointments = require('../models/Appointments');
const User = require('../models/user');
const DentalChart = require('../models/DentalChart');
const InventoryItem = require('../models/InventoryItem');
const DentalTreatment = require('../models/DentalTreatment');
const { createInvoiceForAppointment } = require('./billingService');
const Notification = require('../models/InventoryItem');

/**
 * ==========================================================
 * DENTIST SCENARIO 1
 *
 * Call the next patient from the queue.
 *
 * POST /api/dentist/call-next
 * ==========================================================
 */
exports.callNextPatient = async (req, res) => {
  try {
    const dentistId = req.user?.id;

    if (!dentistId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated dentist information is missing.',
      });
    }

    const { appointmentId } = req.body || {};

    let appointment;

    /**
     * ========================================================
     * CALL SPECIFIC PATIENT
     * ========================================================
     */
    if (appointmentId) {
      appointment =
        await Appointments.findOneAndUpdate(
          {
            _id: appointmentId,
            status: 'ARRIVED',
            tokenNumber: {
              $ne: null,
            },
          },
          {
            $set: {
              status: 'IN_CONSULTATION',
              calledAt: new Date(),
              calledBy: dentistId,
            },
          },
          {
            new: true,
          },
        );
    } else {
      /**
       * ======================================================
       * CALL NEXT PATIENT
       * ======================================================
       *
       * Select the ARRIVED patient with the lowest token.
       */
      const today = new Date()
        .toISOString()
        .split('T')[0];

      appointment =
        await Appointments.findOneAndUpdate(
          {
            appointmentDate: today,
            status: 'ARRIVED',
            tokenNumber: {
              $ne: null,
            },
          },
          {
            $set: {
              status: 'IN_CONSULTATION',
              calledAt: new Date(),
              calledBy: dentistId,
            },
          },
          {
            new: true,
            sort: {
              tokenNumber: 1,
            },
          },
        );
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: appointmentId
          ? 'The selected patient is no longer waiting in the queue.'
          : 'There are no patients waiting in the queue.',
      });
    }

    /**
     * Retrieve populated appointment.
     */
    const populatedAppointment =
      await Appointments.findById(
        appointment._id,
      )
        .populate(
          'patientId',
          'name phone email nic',
        )
        .populate(
          'calledBy',
          'name email role',
        );

    if (!populatedAppointment) {
      return res.status(404).json({
        success: false,
        message:
          'Appointment could not be retrieved after being called.',
      });
    }

    const patient =
      populatedAppointment.patientId;

    return res.status(200).json({
      success: true,

      message:
        'Next patient has been called successfully.',

      appointment: {
        appointmentId:
          populatedAppointment._id,

        patientId:
          patient?._id,

        patientName:
          patient?.name,

        phone:
          patient?.phone,

        email:
          patient?.email,

        nic:
          patient?.nic,

        startTime:
          populatedAppointment.startTime,

        endTime:
          populatedAppointment.endTime,

        appointmentDate:
          populatedAppointment.appointmentDate,

        tokenNumber:
          populatedAppointment.tokenNumber,

        status:
          populatedAppointment.status,

        calledAt:
          populatedAppointment.calledAt,

        calledBy:
          populatedAppointment.calledBy,
      },
    });
  } catch (error) {
    console.error(
      'Dentist call-next error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to call the next patient.',
    });
  }
};


/**
 * ==========================================================
 * DENTIST SCENARIO 2
 *
 * Search patients by:
 *
 * - Name
 * - NIC
 * - Email
 *
 * GET /api/dentist/patients/search?q=...
 * ==========================================================
 */
exports.getTreatmentTypes = async (req, res) => {
  try {
    const { category, search } = req.query || {};
    const filter = { isActive: true };

    if (category) {
      filter.category = String(category).trim().toUpperCase();
    }

    if (search && String(search).trim()) {
      const escaped = String(search)
        .trim()
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );

      filter.$or = [
        {
          name: {
            $regex: escaped,
            $options: 'i',
          },
        },
        {
          aliases: {
            $regex: escaped,
            $options: 'i',
          },
        },
      ];
    }

    const treatments =
      await DentalTreatment.find(filter)
        .select(
          '_id code name category description price aliases',
        )
        .sort({
          category: 1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: treatments.length,
      treatments,
    });
  } catch (error) {
    console.error(
      'Get dental treatment types error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve treatment types.',
    });
  }
};


exports.searchPatients = async (
  req,
  res,
) => {
  try {
    const query =
      typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';

    if (!query) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    /**
     * Escape regex special characters.
     */
    const escapedQuery =
      query.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

    const patients =
      await User.find({
        role: 'patient',

        $or: [
          {
            name: {
              $regex: escapedQuery,
              $options: 'i',
            },
          },

          {
            nic: {
              $regex: escapedQuery,
              $options: 'i',
            },
          },

          {
            email: {
              $regex: escapedQuery,
              $options: 'i',
            },
          },
        ],
      })
        .select(
          '_id name phone email nic',
        )
        .sort({
          name: 1,
        })
        .limit(20)
        .lean();

    return res.status(200).json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error(
      'Dentist patient search error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to search patients.',
    });
  }
};


/**
 * ==========================================================
 * DENTIST SCENARIO 2
 *
 * Get selected patient's dental history.
 *
 * GET /api/dentist/patients/:patientId/history
 * ==========================================================
 */
exports.getPatientHistory = async (
  req,
  res,
) => {
  try {
    const { patientId } =
      req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message:
          'Patient ID is required.',
      });
    }

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
     * Retrieve patient.
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
     * Retrieve dental chart.
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
        .lean();

    return res.status(200).json({
      success: true,

      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        nic: patient.nic,
      },

      dentalChart:
        dentalChart || null,

      treatmentRecords:
        dentalChart?.treatmentRecords ||
        [],
    });
  } catch (error) {
    console.error(
      'Dentist patient history error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve patient history.',
    });
  }
};


/**
 * ==========================================================
 * DENTIST SCENARIOS 3 + 4 + 5
 *
 * Create/save a treatment record.
 *
 * Also deduct consumable inventory materials.
 *
 * POST /api/dentist/patients/:patientId/treatments
 *
 *
 * IMPORTANT MATERIAL WORKFLOW
 * ==========================================================
 *
 * The dentist does NOT enter MongoDB inventory IDs.
 *
 * Dentist sends:
 *
 * "materialsUsed": [
 *   {
 *     "itemName": "Metal Bracket",
 *     "quantityUsed": 2
 *   },
 *   {
 *     "itemName": "Intermaxillary Elastic",
 *     "quantityUsed": 4
 *   }
 * ]
 *
 *
 * Backend:
 *
 * Dentist itemName
 *       ↓
 * Find InventoryItem by itemName
 *       ↓
 * Get actual MongoDB _id
 *       ↓
 * Check stock
 *       ↓
 * Deduct stock
 *       ↓
 * Save treatment
 *
 *
 * Reusable instruments such as:
 *
 * - Scissors
 * - Dental mirrors
 * - Forceps
 * - Explorers
 *
 * should NOT be included.
 *
 *
 * Treatment and inventory deduction happen in the SAME
 * MongoDB transaction.
 *
 * If anything fails:
 *
 * Treatment is NOT saved
 * AND
 * Inventory is NOT deducted.
 *
 * ==========================================================
 */
exports.createTreatmentRecord = async (
  req,
  res,
) => {
  const session =
    await mongoose.startSession();

  /**
   * These variables must exist outside the transaction
   * because they are used in the final response.
   */
  let patientData = null;
  let savedDentalChart = null;
  let deductedMaterials = [];

  try {
    /**
     * ========================================================
     * AUTHENTICATED DENTIST
     * ========================================================
     */
    const dentistId =
      req.user?.id;

    if (!dentistId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated dentist information is missing.',
      });
    }

    /**
     * ========================================================
     * PATIENT ID
     * ========================================================
     */
    const { patientId } =
      req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message:
          'Patient ID is required.',
      });
    }

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
     * DENTIST ID VALIDATION
     * ========================================================
     */
    if (
      !mongoose.Types.ObjectId.isValid(
        dentistId,
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authenticated dentist ID.',
      });
    }

    /**
     * ========================================================
     * REQUEST BODY
     * ========================================================
     */
    const {
      diagnosis,
      treatment,
      treatmentType,
      notes,
      treatmentDate,
      followUpDate,
      materialsUsed,
    } = req.body || {};

    /**
     * Treatment is required.
     */
    if (
      typeof treatment !== 'string' ||
      !treatment.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Treatment/procedure is required.',
      });
    }

    /**
     * ========================================================
     * MATERIALS USED
     * ========================================================
     *
     * Optional.
     *
     * If the treatment does not use consumable inventory:
     *
     * "materialsUsed": []
     *
     * is acceptable.
     */
    let requestedMaterials = [];

    if (
      materialsUsed !== undefined
    ) {
      if (
        !Array.isArray(
          materialsUsed,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'materialsUsed must be an array.',
        });
      }

      requestedMaterials =
        materialsUsed;
    }

    /**
     * ========================================================
     * NORMALIZE MATERIALS
     * ========================================================
     *
     * IMPORTANT:
     *
     * We ONLY accept itemName from the dentist.
     *
     * itemId is NOT required from the dentist.
     */
    const normalizedMaterials =
      [];

    /**
     * Used later to detect duplicate names.
     */
    const materialNames =
      new Set();

    for (
      const material of requestedMaterials
    ) {
      /**
       * Material must be an object.
       */
      if (
        !material ||
        typeof material !== 'object' ||
        Array.isArray(material)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Each material must be an object.',
        });
      }

      /**
       * ======================================================
       * ITEM NAME
       * ======================================================
       */
      const itemName =
        typeof material.itemName ===
        'string'
          ? material.itemName.trim()
          : '';

      if (!itemName) {
        return res.status(400).json({
          success: false,
          message:
            'Each material must contain an itemName.',
        });
      }

      /**
       * ======================================================
       * QUANTITY
       * ======================================================
       *
       * Accept quantityUsed as the primary field.
       *
       * quantity is also accepted for compatibility.
       */
      const quantity =
        material.quantityUsed !==
        undefined
          ? material.quantityUsed
          : material.quantity;

      if (
        typeof quantity !== 'number' ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Material quantity must be a number greater than 0.',
        });
      }

      /**
       * ======================================================
       * DUPLICATE MATERIAL CHECK
       * ======================================================
       *
       * "Metal Bracket"
       * "metal bracket"
       * " Metal Bracket "
       *
       * are treated as the same item.
       */
      const normalizedItemName =
        itemName.toLowerCase();

      if (
        materialNames.has(
          normalizedItemName,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Inventory item "${itemName}" appears more than once in materialsUsed. Combine the quantities into one entry.`,
        });
      }

      materialNames.add(
        normalizedItemName,
      );

      normalizedMaterials.push({
        itemName,
        quantityUsed:
          quantity,
      });
    }

    /**
     * ========================================================
     * TREATMENT DATE
     * ========================================================
     */
    let finalTreatmentDate =
      new Date();

    if (
      treatmentDate !== undefined
    ) {
      const parsedTreatmentDate =
        new Date(
          treatmentDate,
        );

      if (
        Number.isNaN(
          parsedTreatmentDate.getTime(),
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid treatment date.',
        });
      }

      finalTreatmentDate =
        parsedTreatmentDate;
    }

    /**
     * ========================================================
     * FOLLOW-UP DATE
     * ========================================================
     */
    let finalFollowUpDate =
      null;

    if (
      followUpDate !== undefined &&
      followUpDate !== null &&
      followUpDate !== ''
    ) {
      const parsedFollowUpDate =
        new Date(
          followUpDate,
        );

      if (
        Number.isNaN(
          parsedFollowUpDate.getTime(),
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid follow-up date.',
        });
      }

      finalFollowUpDate =
        parsedFollowUpDate;
    }

    /**
     * ========================================================
     * DATABASE TRANSACTION
     * ========================================================
     */
    await session.withTransaction(
      async () => {
        /**
         * Reset this in case the transaction callback is retried.
         */
        deductedMaterials = [];

        /**
         * ======================================================
         * CONFIRM PATIENT
         * ======================================================
         */
        const patient =
          await User.findOne({
            _id: patientId,
            role: 'patient',
          })
            .select(
              '_id name phone email nic',
            )
            .session(session)
            .lean();

        if (!patient) {
          const error =
            new Error(
              'Patient not found.',
            );

          error.statusCode =
            404;

          throw error;
        }

        /**
         * Keep actual patient data for final response.
         */
        patientData =
          patient;

        /**
         * ======================================================
         * FIND THE CURRENT CONSULTATION APPOINTMENT
         * ======================================================
         *
         * The dentist API historically received only patientId.
         * We therefore resolve the appointment currently being
         * treated by this dentist. This keeps the old API usable
         * while linking the new treatment record to the appointment
         * for billing.
         */
        const currentAppointment =
          await Appointments.findOne({
            patientId: patient._id,
            status: 'IN_CONSULTATION',
            calledBy: dentistId,
          })
            .sort({ calledAt: -1 })
            .session(session);

        /**
         * ======================================================
         * RESOLVE BILLABLE TREATMENT TYPE
         * ======================================================
         *
         * The dentist may send treatmentType or simply use the
         * existing treatment field. The backend resolves the name
         * against the configured DentalTreatment catalogue and takes
         * a price snapshot. Inventory unit prices are never used.
         */
        const treatmentLookupName =
          typeof treatmentType === 'string' &&
          treatmentType.trim()
            ? treatmentType.trim()
            : treatment.trim();

        const escapedTreatmentName =
          treatmentLookupName.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          );

        const treatmentMatches =
          await DentalTreatment.find({
            isActive: true,
            $or: [
              {
                name: {
                  $regex:
                    `^${escapedTreatmentName}$`,
                  $options: 'i',
                },
              },
              {
                aliases: {
                  $regex:
                    `^${escapedTreatmentName}$`,
                  $options: 'i',
                },
              },
            ],
          }).session(
            session,
          );

        if (
          treatmentMatches.length ===
          0
        ) {
          const error =
            new Error(
              `Dental treatment type "${treatmentLookupName}" was not found or is inactive. Use a treatment name from the dental treatment catalogue.`,
            );

          error.statusCode =
            404;

          error.treatmentType =
            treatmentLookupName;

          throw error;
        }

        if (
          treatmentMatches.length >
          1
        ) {
          const error =
            new Error(
              `Multiple active dental treatment types match "${treatmentLookupName}". Ask the administrator to make the treatment name unique.`,
            );

          error.statusCode =
            409;

          throw error;
        }

        const selectedTreatment =
          treatmentMatches[0];

        /**
         * ======================================================
         * FIND OR CREATE DENTAL CHART
         * ======================================================
         */
        let dentalChart =
          await DentalChart.findOne({
            patientId:
              patient._id,
          }).session(
            session,
          );

        if (!dentalChart) {
          dentalChart =
            new DentalChart({
              patientId:
                patient._id,

              treatmentRecords:
                [],
            });
        }

        /**
         * ======================================================
         * RESOLVE INVENTORY ITEMS BY NAME
         * ======================================================
         *
         * This is the important modification.
         *
         * Dentist sends:
         *
         * "Metal Bracket"
         *
         * Backend searches:
         *
         * InventoryItem.itemName
         *
         * Then obtains:
         *
         * inventoryItem._id
         *
         * and uses that ID internally for the stock update.
         */
        const resolvedMaterials =
          [];

        for (
          const material of normalizedMaterials
        ) {
          /**
           * Escape regex characters so an item name such as
           * "Composite (A1)" is searched safely.
           */
          const escapedItemName =
            material.itemName.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            );

          /**
           * Case-insensitive EXACT name matching.
           *
           * Example:
           *
           * "Metal Bracket"
           *
           * matches:
           *
           * "Metal Bracket"
           * "metal bracket"
           * "METAL BRACKET"
           *
           * but does NOT match:
           *
           * "Metal Bracket Large"
           */
          const matchingItems =
            await InventoryItem.find({
              itemName: {
                $regex:
                  `^${escapedItemName}$`,
                $options: 'i',
              },

              isActive: true,
            }).session(
              session,
            );

          /**
           * ====================================================
           * ITEM NOT FOUND
           * ====================================================
           */
          if (
            matchingItems.length ===
            0
          ) {
            const error =
              new Error(
                `Inventory item "${material.itemName}" was not found or is inactive.`,
              );

            error.statusCode =
              404;

            error.itemName =
              material.itemName;

            throw error;
          }

          /**
           * ====================================================
           * DUPLICATE INVENTORY ITEM NAME
           * ====================================================
           *
           * There should only be one active inventory item
           * with a given name.
           */
          if (
            matchingItems.length >
            1
          ) {
            const error =
              new Error(
                `Multiple active inventory items named "${material.itemName}" were found. Ask the administrator to make the inventory item name unique.`,
              );

            error.statusCode =
              409;

            error.itemName =
              material.itemName;

            throw error;
          }

          const inventoryItem =
            matchingItems[0];

          /**
           * Keep the actual inventory document internally.
           */
          resolvedMaterials.push({
            itemId:
              inventoryItem._id,

            itemName:
              inventoryItem.itemName,

            quantityUsed:
              material.quantityUsed,

            unit:
              inventoryItem.unit,
          });
        }

        /**
         * ======================================================
         * CREATE INVENTORY MAP
         * ======================================================
         */
        const inventoryMap =
          new Map();

        for (
          const material of resolvedMaterials
        ) {
          /**
           * We already have the actual InventoryItem document
           * through the lookup above, but fetch it again inside
           * the transaction to make sure the stock validation
           * uses the latest database state.
           */
          const inventoryItem =
            await InventoryItem.findOne({
              _id:
                material.itemId,

              isActive:
                true,
            }).session(
              session,
            );

          if (!inventoryItem) {
            const error =
              new Error(
                `Inventory item "${material.itemName}" was not found or is inactive.`,
              );

            error.statusCode =
              404;

            error.itemName =
              material.itemName;

            throw error;
          }

          inventoryMap.set(
            inventoryItem._id.toString(),
            inventoryItem,
          );
        }

        /**
         * ======================================================
         * VALIDATE ALL STOCK BEFORE DEDUCTION
         * ======================================================
         *
         * We check ALL materials first.
         *
         * Example:
         *
         * Metal Bracket:
         * available = 100
         * requested = 2
         *
         * Elastic:
         * available = 1000
         * requested = 4
         *
         * Both must have sufficient stock.
         *
         * If one fails, nothing is saved.
         */
        for (
          const material of resolvedMaterials
        ) {
          const item =
            inventoryMap.get(
              material.itemId.toString(),
            );

          if (!item) {
            const error =
              new Error(
                `Inventory item "${material.itemName}" was not found.`,
              );

            error.statusCode =
              404;

            error.itemName =
              material.itemName;

            throw error;
          }

          /**
           * Insufficient stock.
           */
          if (
            material.quantityUsed >
            item.quantity
          ) {
            const error =
              new Error(
                `Insufficient stock for ${item.itemName}. Available: ${item.quantity} ${item.unit}. Requested: ${material.quantityUsed} ${item.unit}.`,
              );

            error.statusCode =
              409;

            error.availableQuantity =
              item.quantity;

            error.requestedQuantity =
              material.quantityUsed;

            error.itemId =
              item._id;

            error.itemName =
              item.itemName;

            error.unit =
              item.unit;

            throw error;
          }
        }

        /**
         * ======================================================
         * BUILD MATERIAL HISTORY
         * ======================================================
         *
         * We store both:
         *
         * itemId
         * itemName
         *
         * The dentist does not need to provide the ID.
         *
         * The backend adds it automatically.
         */
        const treatmentMaterials =
          resolvedMaterials.map(
            (material) => {
              const item =
                inventoryMap.get(
                  material.itemId.toString(),
                );

              return {
                itemId:
                  item._id,

                itemName:
                  item.itemName,

                quantityUsed:
                  material.quantityUsed,

                unit:
                  item.unit,
              };
            },
          );

        /**
         * ======================================================
         * CREATE TREATMENT RECORD
         * ======================================================
         */
        const treatmentRecord = {
          appointmentId:
            currentAppointment?._id ||
            null,

          treatmentTypeId:
            selectedTreatment._id,

          treatmentTypeName:
            selectedTreatment.name,

          /**
           * IMPORTANT BILLING RULE:
           *
           * NEW_TREATMENT:
           *     Store catalogue treatment price.
           *
           * FOLLOWUP / CHECKUP:
           *     Store 0 because the visit itself is not a
           *     new billable treatment.
           *
           * The treatment type is still saved for clinical
           * history.
           */
          treatmentPrice:
            currentAppointment &&
            String(
              currentAppointment.visitPurpose ||
                '',
            )
              .trim()
              .toUpperCase() ===
              'NEW_TREATMENT'
              ? selectedTreatment.price
              : 0,

          treatmentDate:
            finalTreatmentDate,

          dentistId:
            dentistId,

          diagnosis:
            typeof diagnosis ===
            'string'
              ? diagnosis.trim()
              : '',

          treatment:
            treatment.trim(),

          notes:
            typeof notes ===
            'string'
              ? notes.trim()
              : '',

          followUpDate:
            finalFollowUpDate,

          materialsUsed:
            treatmentMaterials,
        };

        /**
         * Add treatment to patient's dental chart.
         */
        dentalChart.treatmentRecords.push(
          treatmentRecord,
        );

        /**
         * ======================================================
         * DEDUCT INVENTORY
         * ======================================================
         *
         * IMPORTANT:
         *
         * We now use the _id found from itemName.
         *
         * The dentist never needs to know this ID.
         *
         * Atomic condition:
         *
         * quantity >= quantityUsed
         *
         * This prevents negative stock.
         */
        for (
          const material of resolvedMaterials
        ) {
          /**
           * ======================================================
           * GET CURRENT INVENTORY ITEM
           * ======================================================
           *
           * We need the quantity BEFORE deduction so we can determine
           * whether this treatment causes the item to CROSS the
           * reorder threshold.
           */
          const currentItem =
            await InventoryItem.findOne({
              _id:
                material.itemId,

              isActive:
                true,
            }).session(
              session,
            );

          if (!currentItem) {
            const error =
              new Error(
                `Inventory item "${material.itemName}" was not found or is inactive.`,
              );

            error.statusCode =
              404;

            error.itemName =
              material.itemName;

            throw error;
          }

          /**
           * ======================================================
           * VALIDATE CURRENT STOCK
           * ======================================================
           */
          if (
            currentItem.quantity <
            material.quantityUsed
          ) {
            const error =
              new Error(
                `Insufficient stock for ${currentItem.itemName}. Available: ${currentItem.quantity} ${currentItem.unit}. Requested: ${material.quantityUsed} ${currentItem.unit}.`,
              );

            error.statusCode =
              409;

            error.availableQuantity =
              currentItem.quantity;

            error.requestedQuantity =
              material.quantityUsed;

            error.itemId =
              currentItem._id;

            error.itemName =
              currentItem.itemName;

            error.unit =
              currentItem.unit;

            throw error;
          }

          /**
           * ======================================================
           * ATOMIC INVENTORY DEDUCTION
           * ======================================================
           *
           * We still use quantity >= quantityUsed here.
           *
           * This protects against another request changing the
           * inventory between our read and update.
           */
          const updatedItem =
            await InventoryItem.findOneAndUpdate(
              {
                _id:
                  material.itemId,

                isActive:
                  true,

                quantity: {
                  $gte:
                    material.quantityUsed,
                },
              },

              {
                $inc: {
                  quantity:
                    -material.quantityUsed,
                },
              },

              {
                new:
                  true,

                session,
              },
            );

          if (!updatedItem) {
            const error =
              new Error(
                `Inventory stock for "${material.itemName}" changed while the treatment was being processed. Please try again.`,
              );

            error.statusCode =
              409;

            error.itemName =
              material.itemName;

            throw error;
          }

          /**
           * ======================================================
           * LOW-STOCK DETECTION
           * ======================================================
           *
           * BEFORE:
           *
           * currentItem.quantity
           *
           * AFTER:
           *
           * updatedItem.quantity
           *
           * A notification is generated only when:
           *
           * BEFORE > threshold
           *
           * AND
           *
           * AFTER <= threshold
           *
           * This prevents notification spam.
           */
          const wasAboveThreshold =
            currentItem.quantity >
            currentItem.reorderThreshold;

          const isLowStock =
            updatedItem.quantity <=
            updatedItem.reorderThreshold;

          const crossedIntoLowStock =
            wasAboveThreshold &&
            isLowStock;

          /**
           * ======================================================
           * CREATE ADMIN LOW-STOCK NOTIFICATION
           * ======================================================
           */
          if (
            crossedIntoLowStock
          ) {
            /**
             * Find all administrator accounts.
             *
             * This supports more than one administrator in the future.
             */
            const admins =
              await User.find({
                role:
                  'admin',
              })
                .select(
                  '_id',
                )
                .session(
                  session,
                )
                .lean();

            /**
             * Create one unread notification for each administrator.
             *
             * The Notification schema has a unique partial index
             * preventing duplicate unread notifications for the same
             * admin + inventory item.
             */
            for (
              const admin of admins
            ) {
              await Notification.findOneAndUpdate(
                {
                  recipientId:
                    admin._id,

                  inventoryItemId:
                    updatedItem._id,

                  type:
                    'LOW_STOCK',

                  isRead:
                    false,
                },

                {
                  $setOnInsert: {
                    recipientId:
                      admin._id,

                    type:
                      'LOW_STOCK',

                    title:
                      'Low Inventory Stock',

                    message:
                      `${updatedItem.itemName} stock is low. Current quantity: ${updatedItem.quantity} ${updatedItem.unit}. Reorder threshold: ${updatedItem.reorderThreshold} ${updatedItem.unit}.`,

                    inventoryItemId:
                      updatedItem._id,

                    itemName:
                      updatedItem.itemName,

                    currentQuantity:
                      updatedItem.quantity,

                    reorderThreshold:
                      updatedItem.reorderThreshold,

                    unit:
                      updatedItem.unit,

                    isRead:
                      false,

                    readAt:
                      null,
                  },
                },

                {
                  upsert:
                    true,

                  new:
                    true,

                  session,
                },
              );
            }
          }

          /**
           * ======================================================
           * SAVE DEDUCTION INFORMATION
           * ======================================================
           */
          deductedMaterials.push({
            itemId:
              updatedItem._id,

            itemName:
              updatedItem.itemName,

            quantityUsed:
              material.quantityUsed,

            unit:
              updatedItem.unit,

            remainingQuantity:
              updatedItem.quantity,

            reorderThreshold:
              updatedItem.reorderThreshold,

            isLowStock:
              isLowStock,

            lowStockNotificationCreated:
              crossedIntoLowStock,
          });
        }

        /**
         * ======================================================
         * SAVE DENTAL CHART
         * ======================================================
         *
         * This is inside the SAME transaction as inventory
         * deduction.
         */
        await dentalChart.save({
          session,
        });

        savedDentalChart =
          dentalChart;
      },
    );

    /**
     * ========================================================
     * POPULATE DENTIST INFORMATION
     * ========================================================
     */
    await savedDentalChart.populate({
      path:
        'treatmentRecords.dentistId',

      select:
        'name email role',
    });

    /**
     * Get the treatment that was just added.
     */
    const populatedTreatment =
      savedDentalChart
        .treatmentRecords[
          savedDentalChart
            .treatmentRecords.length -
            1
        ];

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */
    return res.status(201).json({
      success: true,

      message:
        'Treatment record saved and inventory updated successfully.',

      patient: {
        id:
          patientData._id,

        name:
          patientData.name,

        phone:
          patientData.phone,

        email:
          patientData.email,

        nic:
          patientData.nic,
      },

      dentalChart: {
        id:
          savedDentalChart._id,

        patientId:
          savedDentalChart.patientId,
      },

      treatmentRecord:
        populatedTreatment,

      inventory: {
        deducted:
          true,

        materialsUsed:
          deductedMaterials,
      },
    });
  } catch (error) {
    console.error(
      'Create treatment record error:',
      error,
    );

    const statusCode =
      error?.statusCode || 500;

    const response = {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : 'Failed to save treatment record.',
    };

    /**
     * Include stock information when insufficient inventory
     * caused the failure.
     */
    if (
      error?.availableQuantity !==
      undefined
    ) {
      response.availableQuantity =
        error.availableQuantity;
    }

    if (
      error?.requestedQuantity !==
      undefined
    ) {
      response.requestedQuantity =
        error.requestedQuantity;
    }

    if (
      error?.itemId !==
      undefined
    ) {
      response.itemId =
        error.itemId;
    }

    if (
      error?.itemName !==
      undefined
    ) {
      response.itemName =
        error.itemName;
    }

    if (
      error?.unit !==
      undefined
    ) {
      response.unit =
        error.unit;
    }

    if (
      error?.treatmentType !==
      undefined
    ) {
      response.treatmentType =
        error.treatmentType;
    }

    return res
      .status(statusCode)
      .json(response);
  } finally {
    await session.endSession();
  }
};


/**
 * ==========================================================
 * DENTIST SCENARIO 6
 *
 * End the current treatment/session.
 *
 * POST /api/dentist/appointments/:appointmentId/end-treatment
 *
 * Status flow:
 *
 * IN_CONSULTATION
 *        ↓
 * COMPLETED
 * ==========================================================
 */
exports.endTreatment = async (
  req,
  res,
) => {
  const session =
    await mongoose.startSession();

  try {
    const dentistId =
      req.user?.id;

    if (!dentistId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated dentist information is missing.',
      });
    }

    const { appointmentId } =
      req.params;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message:
          'Appointment ID is required.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        appointmentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid appointment ID.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        dentistId,
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authenticated dentist ID.',
      });
    }

    let completedAppointment =
      null;

    let billingResult =
      null;

    await session.withTransaction(
      async () => {
        const appointment =
          await Appointments.findById(
            appointmentId,
          ).session(
            session,
          );

        if (!appointment) {
          const error =
            new Error(
              'Appointment not found.',
            );

          error.statusCode =
            404;

          throw error;
        }

        if (
          appointment.status !==
          'IN_CONSULTATION'
        ) {
          const error =
            new Error(
              `Appointment cannot be ended because its current status is "${appointment.status}".`,
            );

          error.statusCode =
            400;

          throw error;
        }

        if (
          !appointment.calledBy ||
          appointment.calledBy.toString() !==
            dentistId.toString()
        ) {
          const error =
            new Error(
              'You are not authorized to end this treatment session.',
            );

          error.statusCode =
            403;

          throw error;
        }

        /**
         * For a NEW_TREATMENT appointment the invoice is created
         * inside the same transaction as appointment completion.
         *
         * If invoice creation fails, the appointment is not completed.
         *
         * FOLLOWUP/CHECKUP appointments are handled by
         * createInvoiceForAppointment() and do not create
         * a new invoice.
         */
        billingResult =
          await createInvoiceForAppointment(
            appointment,
            {
              session,
            },
          );

        appointment.status =
          'COMPLETED';

        appointment.completedAt =
          new Date();

        appointment.completedBy =
          dentistId;

        await appointment.save({
          session,
        });

        completedAppointment =
          appointment;
      },
    );

    const populatedAppointment =
      await Appointments.findById(
        completedAppointment._id,
      )
        .populate(
          'patientId',
          'name phone email nic',
        )
        .populate(
          'calledBy',
          'name email role',
        )
        .populate(
          'completedBy',
          'name email role',
        );

    if (!populatedAppointment) {
      return res.status(404).json({
        success: false,
        message:
          'Completed appointment could not be retrieved.',
      });
    }

    const patient =
      populatedAppointment.patientId;

    return res.status(200).json({
      success: true,

      message:
        billingResult?.created
          ? 'Treatment session completed and invoice generated successfully.'
          : 'Treatment session completed successfully.',

      appointment: {
        appointmentId:
          populatedAppointment._id,

        patientId:
          patient?._id,

        patientName:
          patient?.name,

        phone:
          patient?.phone,

        email:
          patient?.email,

        nic:
          patient?.nic,

        appointmentDate:
          populatedAppointment.appointmentDate,

        startTime:
          populatedAppointment.startTime,

        endTime:
          populatedAppointment.endTime,

        tokenNumber:
          populatedAppointment.tokenNumber,

        status:
          populatedAppointment.status,

        visitPurpose:
          populatedAppointment.visitPurpose,

        calledAt:
          populatedAppointment.calledAt,

        calledBy:
          populatedAppointment.calledBy,

        completedAt:
          populatedAppointment.completedAt,

        completedBy:
          populatedAppointment.completedBy,
      },

      billing:
        billingResult
          ? {
              invoiceCreated:
                billingResult.created,

              reason:
                billingResult.reason,

              invoice:
                billingResult.invoice ||
                null,
            }
          : null,
    });
  } catch (error) {
    console.error(
      'Dentist end-treatment error:',
      error,
    );

    const statusCode =
      error?.statusCode || 500;

    const response = {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : 'Failed to end treatment session.',
    };

    return res
      .status(statusCode)
      .json(response);
  } finally {
    await session.endSession();
  }
};