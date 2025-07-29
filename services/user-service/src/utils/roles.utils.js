
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',              
  USER_ADMIN: 'user_admin',
  FINANCE_ADMIN: 'finance_admin',
  AUDIT_ADMIN: 'audit_admin'
};

// Role permissions mapping
const PERMISSIONS = {
  READ_ALL_USERS: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  READ_USER_DETAILS: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  MANAGE_USERS: [ROLES.ADMIN, ROLES.USER_ADMIN],
  AUDIT_ACCESS: [ROLES.ADMIN, ROLES.AUDIT_ADMIN]
};

const checkPermission = (requiredRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];

    console.log('Checking permissions for user:', req.user);
    console.log('User roles:', userRoles, 'Required roles:', requiredRoles);

    if (userRoles.includes(ROLES.ADMIN)) {
      console.log('User is ADMIN, bypassing permission check.');
      return next(); 
    }

    const hasPermission = userRoles.some(role => requiredRoles.includes(role));
    if (!hasPermission) {
      console.log('Access denied: insufficient permissions');
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }

    console.log('Permission granted.');
    next();
  };
};
module.exports = {
  ROLES,
  PERMISSIONS,
  checkPermission
};