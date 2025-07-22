// Extended roles and permissions for wallet service
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  USER_ADMIN: 'user_admin',
  FINANCE_ADMIN: 'finance_admin',
  AUDIT_ADMIN: 'audit_admin'
};

// Wallet-specific permissions - ADMIN is super admin with full access
const PERMISSIONS = {
  // User permissions (from original service)
  read_all_users: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  read_user_details: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  manage_users: [ROLES.ADMIN, ROLES.USER_ADMIN],
  audit_access: [ROLES.ADMIN, ROLES.AUDIT_ADMIN],
  
  // Basic wallet permissions - all authenticated users
  manage_own_wallet: [ROLES.USER, ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN],
  wallet_transactions: [ROLES.USER, ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN],
  
  // Financial operations - users, finance admins, and SUPER ADMIN
  wallet_deposit: [ROLES.USER, ROLES.ADMIN, ROLES.FINANCE_ADMIN],
  wallet_withdraw: [ROLES.USER, ROLES.ADMIN, ROLES.FINANCE_ADMIN],
  wallet_transfer: [ROLES.USER, ROLES.ADMIN, ROLES.FINANCE_ADMIN],
  
  // Administrative permissions - ADMIN has full access as super admin
  view_all_wallets: [ROLES.ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN],
  view_user_wallets: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN],
  manage_wallet_status: [ROLES.ADMIN, ROLES.FINANCE_ADMIN],  // Super admin + finance admins
  view_all_transactions: [ROLES.ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN]
};

// RBAC middleware generator
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      // Handle both single role and array of roles
      let userRoles = req.user?.role || req.user?.user_role || req.user?.roles;
      
      if (!userRoles) {
        return res.status(403).json({ 
          error: 'No role found in token',
          code: 'ROLE_MISSING',
          debug_info: process.env.NODE_ENV === 'development' ? { 
            available_claims: Object.keys(req.user || {}) 
          } : undefined
        });
      }

      // Normalize to array for consistent checking
      if (!Array.isArray(userRoles)) {
        userRoles = [userRoles];
      }

      const allowedRoles = PERMISSIONS[permission];
      
      if (!allowedRoles) {
        return res.status(500).json({ 
          error: 'Permission not defined',
          code: 'PERMISSION_NOT_DEFINED',
          permission
        });
      }

      // Check if user has any of the allowed roles
      const hasPermission = userRoles.some(role => allowedRoles.includes(role));
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required_permission: permission,
          user_roles: userRoles,
          allowed_roles: allowedRoles
        });
      }

      // Add user roles to request for potential use in controllers
      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Clean exports
module.exports = {
  ROLES,
  PERMISSIONS,
  requirePermission
};
