const mongoose = require('mongoose');

const Notification = require('../models/Notification');
const User = require('../models/user');

/**
 * ==========================================================
 * GET ADMIN NOTIFICATIONS
 * ==========================================================
 *
 * GET /api/admin/notifications
 *
 * ADMIN ONLY
 *
 * Optional:
 *
 * ?unreadOnly=true
 *
 * Returns notifications belonging to the authenticated admin.
 * ==========================================================
 */
exports.getAdminNotifications = async (
  req,
  res,
) => {
  try {
    const adminId =
      req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated administrator information is missing.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        adminId,
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid administrator ID.',
      });
    }

    const unreadOnly =
      String(req.query.unreadOnly)
        .toLowerCase() === 'true';

    const query = {
      recipientId: adminId,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications =
      await Notification.find(query)
        .populate(
          'inventoryItemId',
          'itemName category quantity unit reorderThreshold isActive',
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const unreadCount =
      await Notification.countDocuments({
        recipientId: adminId,
        isRead: false,
      });

    return res.status(200).json({
      success: true,
      count:
        notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(
      'Get admin notifications error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve notifications.',
    });
  }
};


/**
 * ==========================================================
 * GET UNREAD NOTIFICATION COUNT
 * ==========================================================
 *
 * GET /api/admin/notifications/unread-count
 *
 * ADMIN ONLY
 * ==========================================================
 */
exports.getUnreadNotificationCount =
  async (
    req,
    res,
  ) => {
    try {
      const adminId =
        req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated administrator information is missing.',
        });
      }

      const unreadCount =
        await Notification.countDocuments({
          recipientId: adminId,
          isRead: false,
        });

      return res.status(200).json({
        success: true,
        unreadCount,
      });
    } catch (error) {
      console.error(
        'Get unread notification count error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve unread notification count.',
      });
    }
  };


/**
 * ==========================================================
 * MARK ONE NOTIFICATION AS READ
 * ==========================================================
 *
 * PATCH /api/admin/notifications/:notificationId/read
 *
 * ADMIN ONLY
 * ==========================================================
 */
exports.markNotificationAsRead =
  async (
    req,
    res,
  ) => {
    try {
      const adminId =
        req.user?.id;

      const {
        notificationId,
      } = req.params;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated administrator information is missing.',
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          notificationId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid notification ID.',
        });
      }

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id:
              notificationId,
            recipientId:
              adminId,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          },
          {
            new: true,
          },
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            'Notification not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message:
          'Notification marked as read.',
        notification,
      });
    } catch (error) {
      console.error(
        'Mark notification as read error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to mark notification as read.',
      });
    }
  };


/**
 * ==========================================================
 * MARK ALL NOTIFICATIONS AS READ
 * ==========================================================
 *
 * PATCH /api/admin/notifications/read-all
 *
 * ADMIN ONLY
 * ==========================================================
 */
exports.markAllNotificationsAsRead =
  async (
    req,
    res,
  ) => {
    try {
      const adminId =
        req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated administrator information is missing.',
        });
      }

      const result =
        await Notification.updateMany(
          {
            recipientId:
              adminId,
            isRead: false,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          },
        );

      return res.status(200).json({
        success: true,
        message:
          'All notifications marked as read.',
        modifiedCount:
          result.modifiedCount,
      });
    } catch (error) {
      console.error(
        'Mark all notifications as read error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to mark all notifications as read.',
      });
    }
  };