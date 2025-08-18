const { Client } = require('pg');

class NeonDatabaseService {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }

  async getClient() {
    const client = new Client({ connectionString: this.connectionString });
    await client.connect();
    return client;
  }

  async executeMigration(sql) {
    const client = await this.getClient();
    try {
      const result = await client.query(sql);
      return { success: true, result };
    } finally {
      await client.end();
    }
  }

  async insertMockData(tableName, data) {
    if (!data || data.length === 0) return;
    
    const client = await this.getClient();
    try {
      const columns = Object.keys(data[0]);
      const values = data.map(row => `(${columns.map(col => `'${row[col]}'`).join(', ')})`).join(', ');
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`;
      
      await client.query(sql);
    } finally {
      await client.end();
    }
  }

  async executeQuery(sql, userId) {
    const client = await this.getClient();
    try {
      // Add row-level security context
      await client.query(`SET app.current_user_id = '${userId}'`);
      const result = await client.query(sql);
      return result.rows;
    } finally {
      await client.end();
    }
  }
}

module.exports = NeonDatabaseService;