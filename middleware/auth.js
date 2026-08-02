const jwt = require('jsonwebtoken');
const env = require('../config/env')
// @ts-ignore
exports.verifyToken = (req,res,next) => {
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