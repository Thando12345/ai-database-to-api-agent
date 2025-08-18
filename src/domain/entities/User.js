class User {
  constructor(id, email, role = 'user', permissions = []) {
    this.id = id;
    this.email = email;
    this.role = role;
    this.permissions = permissions;
    this.createdAt = new Date();
  }

  hasPermission(permission) {
    return this.permissions.includes(permission) || this.role === 'admin';
  }

  canAccessTable(tableName) {
    return this.hasPermission(`table:${tableName}`) || this.hasPermission('table:*');
  }
}

class AccessPolicy {
  constructor(resource, action, conditions = {}) {
    this.resource = resource;
    this.action = action;
    this.conditions = conditions;
  }

  evaluate(user, context) {
    if (!user.hasPermission(`${this.resource}:${this.action}`)) return false;
    
    // Row-level security
    if (this.conditions.rowFilter) {
      return this.conditions.rowFilter(context.data, user);
    }
    
    return true;
  }
}

module.exports = { User, AccessPolicy };