const WorkingHours = require('../models/WorkingHours');

const defaultHours = [
  { dayOfWeek: 'Monday', startTime: '09:00', endTime: '21:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '21:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '21:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '21:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'Friday', startTime: '09:00', endTime: '21:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'Saturday', startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 }
];

async function seedWorkingHours() {
  await WorkingHours.deleteMany({});
  await WorkingHours.insertMany(defaultHours);
  console.log('Working hours seeded!');
}
module.exports = seedWorkingHours;