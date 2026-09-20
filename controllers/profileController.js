const bcrypt = require('bcrypt');
const User = require('../models/user');

const COMMON_FIELDS = [
  'name',
  'nic',
  'phone',
  'email',
  'dateOfBirth',
  'gender',
  'address',
  'emergencyContact',
];

const PATIENT_FIELDS = [
  'bloodGroup',
  'allergies',
  'medicalConditions',
  'medications',
  'insuranceProvider',
  'insuranceNumber',
];

const STAFF_FIELDS = [
  'professionalRegistrationNumber',
  'qualifications',
  'specialization',
  'yearsOfExperience',
  'languages',
  'professionalBio',
];

function fieldsForRole(role) {
  if (role === 'patient') return [...COMMON_FIELDS, ...PATIENT_FIELDS];
  if (role === 'dentist') return [...COMMON_FIELDS, ...STAFF_FIELDS];
  return COMMON_FIELDS;
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cleanStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(cleanString).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(cleanString)
      .filter(Boolean);
  }

  return [];
}

function buildUpdate(body, role) {
  const allowed = new Set(fieldsForRole(role));
  const update = {};

  for (const field of allowed) {
    if (!(field in body)) continue;

    if (['allergies', 'medicalConditions', 'medications', 'languages'].includes(field)) {
      update[field] = cleanStringArray(body[field]);
      continue;
    }

    if (field === 'emergencyContact') {
      const contact = body[field] && typeof body[field] === 'object' ? body[field] : {};
      update[field] = {
        name: cleanString(contact.name),
        phone: cleanString(contact.phone),
        relationship: cleanString(contact.relationship),
      };
      continue;
    }

    if (field === 'dateOfBirth') {
      const value = cleanString(body[field]);
      update[field] = value ? new Date(value) : null;
      continue;
    }

    if (field === 'yearsOfExperience') {
      const value = body[field];
      update[field] = value === '' || value === null || value === undefined ? null : Number(value);
      continue;
    }

    update[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
  }

  if (update.email) update.email = update.email.toLowerCase();
  return update;
}

function serializeUser(user) {
  const object = user.toObject ? user.toObject() : user;
  delete object.passwordHash;
  delete object.__v;
  return object;
}

async function getMyProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -__v').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve profile.',
    });
  }
}

async function updateMyProfile(req, res) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ success: false, message: 'Authenticated user information is missing.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const update = buildUpdate(body, role);

    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: 'No profile fields were provided.' });
    }

    if (!update.name) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    if (!update.email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    if (!update.nic) {
      return res.status(400).json({ success: false, message: 'NIC is required.' });
    }

    if (update.dateOfBirth && Number.isNaN(update.dateOfBirth.getTime())) {
      return res.status(400).json({ success: false, message: 'Date of birth is invalid.' });
    }

    if (update.yearsOfExperience !== undefined && update.yearsOfExperience !== null) {
      if (!Number.isInteger(update.yearsOfExperience) || update.yearsOfExperience < 0) {
        return res.status(400).json({ success: false, message: 'Years of experience must be a non-negative whole number.' });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true, context: 'query' },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      const label = duplicateField === 'nic' ? 'NIC' : 'email';
      return res.status(409).json({
        success: false,
        message: `Another account already uses this ${label}.`,
      });
    }

    if (error?.name === 'ValidationError') {
      const message = Object.values(error.errors || {})
        .map((item) => item.message)
        .join(' ');
      return res.status(400).json({ success: false, message: message || 'Invalid profile information.' });
    }

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update profile.',
    });
  }
}

async function changeMyPassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password and confirmation are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least 8 characters.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to change password.',
    });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
