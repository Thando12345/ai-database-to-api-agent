class AutonomousAgentUseCase {
  constructor(imageToSchemaUseCase, voiceToERDUseCase, schemaToAPIUseCase, databaseManagementUseCase) {
    this.imageToSchemaUseCase = imageToSchemaUseCase;
    this.voiceToERDUseCase = voiceToERDUseCase;
    this.schemaToAPIUseCase = schemaToAPIUseCase;
    this.databaseManagementUseCase = databaseManagementUseCase;
  }

  async executeFullWorkflow(input, workflowType = 'image') {
    const steps = [];
    
    try {
      // Step 1: Generate Schema
      let schema;
      if (workflowType === 'image') {
        schema = await this.imageToSchemaUseCase.execute(input);
        steps.push({ step: 'schema_generation', status: 'completed', result: 'Schema generated from image' });
      } else {
        schema = await this.voiceToERDUseCase.execute(input);
        steps.push({ step: 'schema_generation', status: 'completed', result: 'Schema generated from voice' });
      }

      // Step 2: Run Migration
      await this.databaseManagementUseCase.runMigration(schema);
      steps.push({ step: 'migration', status: 'completed', result: 'Database tables created' });

      // Step 3: Generate Mock Data
      await this.databaseManagementUseCase.generateMockData(schema, 50);
      steps.push({ step: 'mock_data', status: 'completed', result: '50 mock records generated' });

      // Step 4: Generate and Deploy API
      const deployment = await this.schemaToAPIUseCase.execute(schema);
      steps.push({ step: 'api_deployment', status: 'completed', result: `API deployed to ${deployment.url}` });

      return {
        success: true,
        schema: schema.toSQL(),
        apiUrl: deployment.url,
        steps
      };

    } catch (error) {
      steps.push({ step: 'error', status: 'failed', result: error.message });
      return { success: false, error: error.message, steps };
    }
  }
}

module.exports = AutonomousAgentUseCase;