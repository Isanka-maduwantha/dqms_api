const VisitPurpose = require('../models/VisitPurpose');

const WorkingHours = require('../models/WorkingHours');

const defaultHours = [
  { dayOfWeek: 'Monday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Friday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Saturday', startTime: '09:00', endTime: '22:00' },
  { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '22:00' },
];

async function seedWorkingHours() {
  await WorkingHours.deleteMany({});
  await WorkingHours.insertMany(defaultHours);
  console.log('Working hours seeded for 09:00-22:00 clinic hours.');
}

const visitingPurposeList = [
  { purpose: "New Treatment" },
  { purpose: "Follow Up Review" },
  { purpose: "Routine Checkup" }
];
async function seedVisitingPurpose(){
  await VisitPurpose.deleteMany({});
  await VisitPurpose.insertMany(visitingPurposeList);
  console.log("Visiting Purpose Seeded")
}

module.exports = {
  seedWorkingHours,
  seedVisitingPurpose
};
