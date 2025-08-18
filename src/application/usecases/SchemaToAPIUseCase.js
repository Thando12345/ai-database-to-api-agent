const { APISpec, Endpoint } = require('../../domain/entities/APISpec');

class SchemaToAPIUseCase {
  constructor(apiGenerator, deploymentService) {
    this.apiGenerator = apiGenerator;
    this.deploymentService = deploymentService;
  }

  async execute(schema, securityConfig = {}) {
    if (typeof schema === 'string') {
      // If schema is a SQL string, parse it or use it directly
      return await this.apiGenerator.generateAPICode({ sql: schema });
    }
    
    const apiSpec = this.generateAPISpec(schema, securityConfig);
    return await this.apiGenerator.generateAPICode(apiSpec);
  }

  generateAPISpec(schema, securityConfig) {
    // Handle both schema object and parsed schema
    const schemaName = schema.schema_name || schema.name || 'generated';
    const tables = schema.tables || [];
    
    if (!tables.length) {
      throw new Error('No tables found in schema');
    }
    
    const apiSpec = new APISpec(`${schemaName}_api`, [], securityConfig);
    
    tables.forEach(table => {
      const basePath = `/${table.name.toLowerCase()}`;
      
      // CRUD endpoints
      apiSpec.addEndpoint(new Endpoint(`${basePath}`, 'get', `List ${table.name}`));
      apiSpec.addEndpoint(new Endpoint(`${basePath}`, 'post', `Create ${table.name}`));
      apiSpec.addEndpoint(new Endpoint(`${basePath}/{id}`, 'get', `Get ${table.name}`));
      apiSpec.addEndpoint(new Endpoint(`${basePath}/{id}`, 'put', `Update ${table.name}`));
      apiSpec.addEndpoint(new Endpoint(`${basePath}/{id}`, 'delete', `Delete ${table.name}`));
    });
    
    return apiSpec;
  }
}

module.exports = SchemaToAPIUseCase;