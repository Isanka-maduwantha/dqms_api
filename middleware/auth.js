const jwt = require('jsonwebtoken');
const env = require('../config/env')
// @ts-ignore
exports.authenticateToken = (req,res,next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({message : 'Access denied. No token provided.'});
    }

    try {
        // @ts-ignore
        const decoded = jwt.verify(token,env.JWT_SECRET);
        req.user = decoded;
        next()
    } catch (error) {
        res.status(403).json({message: 'Invalid or expired token'});
    }
}

// Restricts a route to the given roles, e.g. authorizeRoles('dentist','admin')
// Used by Modules 6/7/8 to gate dentist/admin-only actions.
// @ts-ignore
exports.authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
}