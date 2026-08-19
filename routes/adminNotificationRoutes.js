const express = require('express');

const router =
  express.Router();

const {
  authenticateToken,
} = require('../middleware/auth');

const {
  authorizeRole,
} = require('../middleware/authorizeRole');

const notificationController =
  require('../controllers/notificationController');


/**
 * ==========================================================
 * ADMIN NOTIFICATION ROUTES
 * ==========================================================
 *
 * All routes require:
 *
 * 1. Valid JWT
 * 2. role = admin
 *
 * ==========================================================
 */


/**
 * GET ALL ADMIN NOTIFICATIONS
 *
 * GET /api/admin/notifications
 *
 * Optional:
 *
 * ?unreadOnly=true
 */
router.get(
  '/notifications',
  authenticateToken,
  authorizeRole('admin'),
  notificationController.getAdminNotifications,
);


/**
 * GET UNREAD COUNT
 *
 * GET /api/admin/notifications/unread-count
 */
router.get(
  '/notifications/unread-count',
  authenticateToken,
  authorizeRole('admin'),
  notificationController.getUnreadNotificationCount,
);


/**
 * MARK ONE AS READ
 *
 * PATCH /api/admin/notifications/:notificationId/read
 */
router.patch(
  '/notifications/:notificationId/read',
  authenticateToken,
  authorizeRole('admin'),
  notificationController.markNotificationAsRead,
);


/**
 * MARK ALL AS READ
 *
 * PATCH /api/admin/notifications/read-all
 */
router.patch(
  '/notifications/read-all',
  authenticateToken,
  authorizeRole('admin'),
  notificationController.markAllNotificationsAsRead,
);


module.exports = router;