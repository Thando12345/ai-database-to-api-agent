class AccessControlUseCase {
  constructor(userRepository, policyRepository) {
    this.userRepository = userRepository;
    this.policyRepository = policyRepository;
  }

  async enforceAccess(userId, resource, action, context = {}) {
    const user = await this.userRepository.findById(userId);
    const policies = await this.policyRepository.findByResource(resource);
    
    for (const policy of policies) {
      if (!policy.evaluate(user, { ...context, action })) {
        throw new Error(`Access denied: ${action} on ${resource}`);
      }
    }
    
    return true;
  }

  async applyDataMasking(data, userId, tableName) {
    const user = await this.userRepository.findById(userId);
    
    if (user.hasPermission(`mask:${tableName}`)) {
      return this.maskSensitiveData(data);
    }
    
    return data;
  }

  maskSensitiveData(data) {
    const sensitiveFields = ['email', 'phone', 'ssn', 'credit_card'];
    
    return data.map(row => {
      const masked = { ...row };
      sensitiveFields.forEach(field => {
        if (masked[field]) masked[field] = '***MASKED***';
      });
      return masked;
    });
  }
}

module.exports = AccessControlUseCase;