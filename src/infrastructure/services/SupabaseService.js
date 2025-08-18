const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (this.supabaseUrl && this.supabaseKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      this.adminClient = createClient(this.supabaseUrl, this.serviceKey);
      this.enabled = true;
    } else {
      this.enabled = false;
      console.log('📝 Supabase not configured - running in demo mode');
    }
  }

  async createSchema(schema) {
    if (!this.enabled) {
      return { id: Date.now(), name: schema.name, created_at: new Date().toISOString() };
    }
    
    const { data, error } = await this.supabase
      .from('schemas')
      .insert({
        name: schema.name,
        tables: schema.tables,
        relationships: schema.relationships,
        sql: schema.toSQL(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Schema creation failed: ${error.message}`);
    return data;
  }

  async executeMigration(sql) {
    if (!this.enabled) {
      return { success: true, result: 'Demo mode - SQL not executed' };
    }
    
    try {
      const { data, error } = await this.adminClient.rpc('execute_sql', {
        sql_query: sql
      });

      if (error) throw new Error(`Migration failed: ${error.message}`);
      return { success: true, result: data };
    } catch (err) {
      throw new Error(`Migration execution failed: ${err.message}`);
    }
  }

  async insertMockData(tableName, records) {
    if (!records || records.length === 0) return;

    const { data, error } = await this.supabase
      .from(tableName)
      .insert(records)
      .select();

    if (error) throw new Error(`Mock data insertion failed: ${error.message}`);
    return data;
  }

  async executeQuery(sql, userId) {
    try {
      // Set RLS context for user
      await this.supabase.rpc('set_current_user', { user_id: userId });
      
      const { data, error } = await this.supabase.rpc('execute_query', {
        query: sql
      });

      if (error) throw new Error(`Query execution failed: ${error.message}`);
      return data;
    } catch (err) {
      throw new Error(`Query failed: ${err.message}`);
    }
  }

  async saveAPISpec(apiSpec, schemaId) {
    const { data, error } = await this.supabase
      .from('api_specs')
      .insert({
        schema_id: schemaId,
        name: apiSpec.name,
        version: apiSpec.version,
        endpoints: apiSpec.endpoints,
        openapi_spec: apiSpec.toOpenAPI(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`API spec save failed: ${error.message}`);
    return data;
  }

  async getSchemas(userId) {
    const { data, error } = await this.supabase
      .from('schemas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Schema retrieval failed: ${error.message}`);
    return data;
  }

  async getAPISpecs(schemaId) {
    const { data, error } = await this.supabase
      .from('api_specs')
      .select('*')
      .eq('schema_id', schemaId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`API spec retrieval failed: ${error.message}`);
    return data;
  }
}

module.exports = SupabaseService;