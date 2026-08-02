const WorkingHours = require('../models/WorkingHours');

const defaultHours = [
  { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  { dayOfWeek: 'Saturday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 15 }
];

async function seedWorkingHours() {
  await WorkingHours.deleteMany({});
  await WorkingHours.insertMany(defaultHours);
  console.log('Working hours seeded!');
}
module.exports = seedWorkingHours;