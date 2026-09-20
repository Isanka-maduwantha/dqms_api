const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} = require('../controllers/profileController');

const router = express.Router();

router.use(authenticateToken);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/me/change-password', changeMyPassword);

module.exports = router;
