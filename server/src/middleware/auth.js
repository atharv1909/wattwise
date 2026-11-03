/**
 * WattWise Authentication & Authorization Middleware
 * Verifies JWT tokens and enforces role-based access control.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wattwise_super_secret_key_tpds3';

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 * Extracts token from Authorization header, verifies signature and validity,
 * and attaches decoded user payload { id, email, role } to req.user.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header missing. Bearer token required.'
      }
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization format. Format should be: Bearer <token>'
      }
    });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token: ' + err.message
        }
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  });
}

/**
 * Middleware to restrict route access strictly to admin role.
 * Must be placed after authenticateToken middleware.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required before role verification'
      }
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden: Admin privileges required to access this resource'
      }
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};
