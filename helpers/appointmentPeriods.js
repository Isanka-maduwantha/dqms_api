const Appointments = require('../models/Appointments');
const AppointmentCounter = require('../models/appointmentCounter');
const QueueTokenCounter = require('../models/QueueTokenCounter');
const WorkingHours = require('../models/WorkingHours');
const DoctorLeave = require('../models/DoctorLeave');

const APPOINTMENT_PERIODS = {
  MORNING: {
    label: 'Morning',
    startTime: '09:00',
    endTime: '12:00',
    capacity: 10,
  },
  AFTERNOON: {
    label: 'Afternoon',
    startTime: '12:00',
    endTime: '17:00',
    capacity: 6,
  },
  EVENING: {
    label: 'Evening',
    startTime: '17:00',
    endTime: '22:00',
    capacity: 20,
  },
};

const CLINIC_TIME_ZONE = 'Asia/Colombo';

const CLINIC_START_TIME = '09:00';
const CLINIC_END_TIME = '22:00';

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getClinicTodayKey() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find(
    (p) => p.type === 'year'
  )?.value;

  const month = parts.find(
    (p) => p.type === 'month'
  )?.value;

  const day = parts.find(
    (p) => p.type === 'day'
  )?.value;

  return `${year}-${month}-${day}`;
}

function getClinicNowParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((p) => p.type === 'hour')?.value || 0
  );

  const minute = Number(
    parts.find((p) => p.type === 'minute')?.value || 0
  );

  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value)
    .split(':')
    .map(Number);

  return hour * 60 + minute;
}

function getPeriodConfig(period) {
  return (
    APPOINTMENT_PERIODS[
      String(period || '')
        .trim()
        .toUpperCase()
    ] || null
  );
}

function getDayName(appointmentDate) {
  const [year, month, day] = appointmentDate
    .split('-')
    .map(Number);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(
    new Date(
      Date.UTC(year, month - 1, day)
    )
  );
}

async function getWorkingDaySchedule(appointmentDate) {
  const dayName = getDayName(appointmentDate);

  const schedule = await WorkingHours.findOne({
    dayOfWeek: dayName,
  }).lean();

  if (!schedule) {
    throw createError(
      `Clinic is closed on ${dayName}.`
    );
  }

  return {
    dayName,
    schedule,
  };
}

function isPeriodOutsideClinicHours(config) {
  const clinicStart = timeToMinutes(
    CLINIC_START_TIME
  );

  const clinicEnd = timeToMinutes(
    CLINIC_END_TIME
  );

  return (
    timeToMinutes(config.startTime) <
      clinicStart ||
    timeToMinutes(config.endTime) >
      clinicEnd
  );
}

async function validateAppointmentPeriod(
  appointmentDate,
  appointmentPeriod
) {
  if (!isValidDate(appointmentDate)) {
    throw createError(
      'A valid appointment date (YYYY-MM-DD) is required.'
    );
  }

  const period = String(
    appointmentPeriod || ''
  )
    .trim()
    .toUpperCase();

  const config = getPeriodConfig(period);

  if (!config) {
    throw createError(
      'Appointment period must be MORNING, AFTERNOON, or EVENING.'
    );
  }

  const { dayName } =
    await getWorkingDaySchedule(
      appointmentDate
    );

  /*
   * Appointment periods use the clinic's fixed
   * 09:00-22:00 operating window.
   *
   * WorkingHours is still used to determine whether
   * the clinic has a schedule for this day, but an old
   * 17:00 database default must not disable the Evening
   * 17:00-22:00 appointment period.
   */
  if (isPeriodOutsideClinicHours(config)) {
    throw createError(
      `${config.label} appointments are outside the clinic working hours on ${dayName}.`
    );
  }

  const todayKey = getClinicTodayKey();

  if (appointmentDate < todayKey) {
    throw createError(
      'Cannot book an appointment in the past.'
    );
  }

  /*
   * For today:
   *
   * Morning 09:00-12:00
   * Afternoon 12:00-17:00
   * Evening 17:00-22:00
   *
   * A period remains bookable until its END time.
   * Future periods on the same day remain bookable
   * even when their start time has not arrived yet.
   */
  if (appointmentDate === todayKey) {
    const now =
      getClinicNowParts().totalMinutes;

    const periodEnd = timeToMinutes(
      config.endTime
    );

    if (periodEnd <= now) {
      throw createError(
        `${config.label} appointments are no longer available today.`
      );
    }
  }

  const leave = await DoctorLeave.findOne({
    leaveDate: appointmentDate,
  }).lean();

  if (leave) {
    throw createError(
      'The dentist is on leave on the selected date.'
    );
  }

  const activeCount =
    await Appointments.countDocuments({
      appointmentDate,
      appointmentPeriod: period,
      status: {
        $nin: [
          'CANCELLED',
          'COMPLETED',
        ],
      },
      appointmentNumber: {
        $type: 'number',
      },
    });

  const counter =
    await AppointmentCounter.findOne({
      appointmentDate,
      appointmentPeriod: period,
    })
      .select('nextNumber')
      .lean();

  if (
    (counter?.nextNumber || 0) >=
    config.capacity
  ) {
    throw createError(
      `${config.label} is full. Maximum capacity is ${config.capacity} patients.`
    );
  }

  if (activeCount >= config.capacity) {
    throw createError(
      `${config.label} is full. Maximum capacity is ${config.capacity} patients.`
    );
  }

  return {
    period,
    config,
    dayName,
    booked: activeCount,
    nextNumber:
      (counter?.nextNumber || 0) + 1,
  };
}

async function allocateAppointmentNumber(
  appointmentDate,
  appointmentPeriod
) {
  if (!isValidDate(appointmentDate)) {
    throw createError(
      'A valid appointment date (YYYY-MM-DD) is required.'
    );
  }

  const period = String(
    appointmentPeriod || ''
  )
    .trim()
    .toUpperCase();

  const config = getPeriodConfig(period);

  if (!config) {
    throw createError(
      'Invalid appointment period.'
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      let counter =
        await AppointmentCounter.findOne({
          appointmentDate,
          appointmentPeriod: period,
        });

      if (!counter) {
        const lastAppointment =
          await Appointments.findOne({
            appointmentDate,
            appointmentPeriod: period,
            appointmentNumber: {
              $type: 'number',
            },
          })
            .sort({
              appointmentNumber: -1,
            })
            .select('appointmentNumber')
            .lean();

        const initialValue =
          lastAppointment?.appointmentNumber ||
          0;

        try {
          counter =
            await AppointmentCounter.create({
              appointmentDate,
              appointmentPeriod: period,
              nextNumber: initialValue,
            });
        } catch (error) {
          if (error?.code !== 11000) {
            throw error;
          }

          counter =
            await AppointmentCounter.findOne({
              appointmentDate,
              appointmentPeriod: period,
            });
        }
      }

      const updatedCounter =
        await AppointmentCounter.findOneAndUpdate(
          {
            appointmentDate,
            appointmentPeriod: period,
            nextNumber: {
              $lt: config.capacity,
            },
          },
          {
            $inc: {
              nextNumber: 1,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedCounter) {
        throw createError(
          `${config.label} is full. Maximum capacity is ${config.capacity} patients.`
        );
      }

      return updatedCounter.nextNumber;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw createError(
    'Unable to allocate an appointment number. Please try again.',
    409
  );
}

async function allocateQueueToken(
  appointmentDate
) {
  if (!isValidDate(appointmentDate)) {
    throw createError(
      'A valid appointment date (YYYY-MM-DD) is required.'
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      let counter =
        await QueueTokenCounter.findOne({
          appointmentDate,
        });

      if (!counter) {
        const lastToken =
          await Appointments.findOne({
            appointmentDate,
            tokenNumber: {
              $type: 'number',
            },
          })
            .sort({
              tokenNumber: -1,
            })
            .select('tokenNumber')
            .lean();

        try {
          counter =
            await QueueTokenCounter.create({
              appointmentDate,
              nextToken:
                lastToken?.tokenNumber || 0,
            });
        } catch (error) {
          if (error?.code !== 11000) {
            throw error;
          }

          counter =
            await QueueTokenCounter.findOne({
              appointmentDate,
            });
        }
      }

      const updated =
        await QueueTokenCounter.findOneAndUpdate(
          {
            appointmentDate,
          },
          {
            $inc: {
              nextToken: 1,
            },
          },
          {
            new: true,
          }
        );

      if (updated) {
        return updated.nextToken;
      }
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw createError(
    'Unable to allocate a queue token. Please try again.',
    409
  );
}

async function getAppointmentPeriods(
  appointmentDate
) {
  if (!isValidDate(appointmentDate)) {
    throw createError(
      'A valid appointment date (YYYY-MM-DD) is required.'
    );
  }

  const {
    dayName,
  } = await getWorkingDaySchedule(
    appointmentDate
  );

  const todayKey = getClinicTodayKey();

  const nowMinutes =
    getClinicNowParts().totalMinutes;

  const periods = [];

  for (const [
    key,
    config,
  ] of Object.entries(
    APPOINTMENT_PERIODS
  )) {
    const activeAppointments =
      await Appointments.find({
        appointmentDate,
        appointmentPeriod: key,
        status: {
          $nin: [
            'CANCELLED',
            'COMPLETED',
          ],
        },
        appointmentNumber: {
          $type: 'number',
        },
      })
        .select('appointmentNumber')
        .sort({
          appointmentNumber: 1,
        })
        .lean();

    const bookedNumbers =
      activeAppointments
        .map(
          (appointment) =>
            appointment.appointmentNumber
        )
        .filter(
          (number) =>
            Number.isInteger(number)
        );

    const counter =
      await AppointmentCounter.findOne({
        appointmentDate,
        appointmentPeriod: key,
      })
        .select('nextNumber')
        .lean();

    const lastIssuedNumber =
      counter?.nextNumber || 0;

    const nextAppointmentNumber =
      lastIssuedNumber + 1;

    const sequentialRemaining =
      Math.max(
        config.capacity -
          lastIssuedNumber,
        0
      );

    const capacityRemaining =
      Math.max(
        config.capacity -
          bookedNumbers.length,
        0
      );

    /*
     * The clinic appointment periods are fixed:
     * 09:00-12:00
     * 12:00-17:00
     * 17:00-22:00
     *
     * Do NOT compare them with the old
     * WorkingHours 17:00 default.
     */
    const outsideWorkingHours =
      isPeriodOutsideClinicHours(
        config
      );

    /*
     * A period ends only when its END time has
     * passed on the current clinic date.
     */
    const periodEnded =
      appointmentDate === todayKey &&
      timeToMinutes(config.endTime) <=
        nowMinutes;

    const availableNumbers = [];

    if (
      !periodEnded &&
      !outsideWorkingHours
    ) {
      for (
        let number =
          nextAppointmentNumber;
        number <= config.capacity;
        number += 1
      ) {
        availableNumbers.push(number);
      }
    }

    const available =
      !periodEnded &&
      !outsideWorkingHours &&
      sequentialRemaining > 0 &&
      capacityRemaining > 0;

    let reason = 'Available';

    if (periodEnded) {
      reason = 'Period has ended';
    } else if (outsideWorkingHours) {
      reason =
        'Outside clinic working hours';
    } else if (
      sequentialRemaining === 0 ||
      capacityRemaining === 0
    ) {
      reason = 'Full';
    }

    periods.push({
      period: key,
      label: config.label,
      startTime: config.startTime,
      endTime: config.endTime,
      capacity: config.capacity,
      booked: bookedNumbers.length,
      remaining: capacityRemaining,
      nextAppointmentNumber:
        sequentialRemaining > 0
          ? nextAppointmentNumber
          : null,
      availableNumbers,
      bookedNumbers,
      available,
      reason,
    });
  }

  return {
    date: appointmentDate,
    periods,
  };
}

module.exports = {
  APPOINTMENT_PERIODS,
  CLINIC_TIME_ZONE,
  getPeriodConfig,
  validateAppointmentPeriod,
  allocateAppointmentNumber,
  allocateQueueToken,
  getAppointmentPeriods,
  createError,
  isValidDate,
  getClinicTodayKey,
};