/**
 * Allows access only to users whose role matches
 * one of the supplied roles.
 *
 * authenticateToken must run before this middleware
 * so that req.user is available.
 */

exports.authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource.',
      });
    }

    next();
  };
};