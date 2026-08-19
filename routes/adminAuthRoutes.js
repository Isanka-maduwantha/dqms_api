const express = require('express');

const router = express.Router();

const {
    adminLogin,
} = require('../controllers/authController');


/**
 * ==========================================================
 * ADMIN AUTHENTICATION
 * ==========================================================
 *
 * These routes are specifically for the Admin Portal.
 *
 * ==========================================================
 */


/**
 * ==========================================================
 * ADMIN LOGIN
 * ==========================================================
 *
 * POST /api/admin/login
 *
 * Body:
 *
 * {
 *   "email": "admin@example.com",
 *   "password": "password"
 * }
 *
 * Only users whose database role is "admin" can log in.
 * ==========================================================
 */
router.post(
    '/login',
    adminLogin
);


module.exports = router;