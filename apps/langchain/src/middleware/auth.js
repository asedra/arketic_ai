import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  try {
    console.error('🔑 AUTH MIDDLEWARE STARTED');
    const authHeader = req.headers.authorization;
    console.error('🔑 Auth header:', authHeader);
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No authorization header provided',
        code: 'AUTH_HEADER_MISSING'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'TOKEN_MISSING'
      });
    }
    
    console.error('🔑 Token:', token.substring(0, 50) + '...');
    console.error('🔑 Secret available:', !!process.env.JWT_SECRET_KEY);
    console.error('🔑 Secret length:', process.env.JWT_SECRET_KEY?.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.error('🔑 JWT decoded successfully:', decoded);
    
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      username: decoded.username,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    next();
  } catch (error) {
    const fs = require('fs');
    fs.appendFileSync('/app/auth-debug.log', `JWT Error: ${error.name} - ${error.message}\n`);
    fs.appendFileSync('/app/auth-debug.log', `Stack: ${error.stack}\n`);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

export const internalServiceAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-internal-api-key'];
    
    if (!apiKey) {
      return res.status(403).json({ 
        error: 'Internal API key missing',
        code: 'INTERNAL_KEY_MISSING'
      });
    }
    
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ 
        error: 'Invalid internal API key',
        code: 'INTERNAL_KEY_INVALID'
      });
    }
    
    req.isInternalService = true;
    next();
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal authentication error',
      code: 'INTERNAL_AUTH_ERROR'
    });
  }
};

export const roleMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole && requiredRoles.length > 0) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        current: userRoles
      });
    }
    
    next();
  };
};

export const permissionMiddleware = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasRequiredPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermission && requiredPermissions.length > 0) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        current: userPermissions
      });
    }
    
    next();
  };
};