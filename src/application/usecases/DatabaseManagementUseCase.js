class DatabaseManagementUseCase {
  constructor(databaseService, llmService) {
    this.databaseService = databaseService;
    this.llmService = llmService;
  }

  async runMigration(schema) {
    const migrationSQL = schema.toSQL();
    return await this.databaseService.executeMigration(migrationSQL);
  }

  async generateMockData(schema, recordCount = 100) {
    const mockDataPrompt = `Generate ${recordCount} realistic mock records for: ${schema.toSQL()}`;
    const mockData = await this.llmService.generateMockData(mockDataPrompt);
    
    for (const table of schema.tables) {
      await this.databaseService.insertMockData(table.name, mockData[table.name]);
    }
    
    return mockData;
  }

  async executeNaturalLanguageQuery(query, userId) {
    const sqlQuery = await this.llmService.convertToSQL(query);
    
    // Security check
    if (this.containsDangerousOperations(sqlQuery)) {
      throw new Error('Query contains potentially dangerous operations');
    }
    
    return await this.databaseService.executeQuery(sqlQuery, userId);
  }

  containsDangerousOperations(sql) {
    const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE'];
    return dangerous.some(op => sql.toUpperCase().includes(op));
  }
}

module.exports = DatabaseManagementUseCase;