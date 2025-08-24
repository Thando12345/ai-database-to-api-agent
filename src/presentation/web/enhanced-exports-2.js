// Enhanced API Generation with Real Endpoints
function generateEnhancedAPI(baseAPI) {
    const timestamp = new Date().toISOString();
    const header = `/*
 * AI Database-to-API Agent - Generated API
 * Session: ${currentSessionId}
 * Generated: ${timestamp}
 * Production-ready Express.js API with real endpoints
 */

`;
    
    let enhanced = header;
    enhanced += `const express = require('express');\n`;
    enhanced += `const { Pool } = require('pg');\n`;
    enhanced += `const cors = require('cors');\n`;
    enhanced += `const helmet = require('helmet');\n`;
    enhanced += `const rateLimit = require('express-rate-limit');\n\n`;
    
    enhanced += `const app = express();\n\n`;
    
    // Security middleware
    enhanced += `// Security & Middleware\n`;
    enhanced += `app.use(helmet());\n`;
    enhanced += `app.use(cors());\n`;
    enhanced += `app.use(express.json({ limit: '10mb' }));\n`;
    enhanced += `app.use(express.urlencoded({ extended: true }));\n\n`;
    
    // Rate limiting
    enhanced += `const limiter = rateLimit({\n`;
    enhanced += `  windowMs: 15 * 60 * 1000, // 15 minutes\n`;
    enhanced += `  max: 100 // limit each IP to 100 requests per windowMs\n`;
    enhanced += `});\n`;
    enhanced += `app.use(limiter);\n\n`;
    
    // Database connection
    enhanced += `// Database Connection\n`;
    enhanced += `const pool = new Pool({\n`;
    enhanced += `  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',\n`;
    enhanced += `  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false\n`;
    enhanced += `});\n\n`;
    
    // Add real CRUD operations
    const tables = currentGeneratedSchema ? parseSchemaToTables(currentGeneratedSchema) : [
        { name: 'users', columns: [{ name: 'id', type: 'SERIAL' }, { name: 'name', type: 'VARCHAR(255)' }] },
        { name: 'products', columns: [{ name: 'id', type: 'SERIAL' }, { name: 'name', type: 'VARCHAR(255)' }] }
    ];
    
    tables.forEach(table => {
        enhanced += generateRealCRUDEndpoints(table);
    });
    
    // Error handling
    enhanced += `\n// Error Handling\n`;
    enhanced += `app.use((err, req, res, next) => {\n`;
    enhanced += `  console.error(err.stack);\n`;
    enhanced += `  res.status(500).json({ error: 'Something went wrong!' });\n`;
    enhanced += `});\n\n`;
    
    // Server startup
    enhanced += `const PORT = process.env.PORT || 3000;\n`;
    enhanced += `app.listen(PORT, () => {\n`;
    enhanced += `  console.log(\`🚀 API Server running on port \${PORT}\`);\n`;
    enhanced += `  console.log(\`📊 Database: \${process.env.DATABASE_URL ? 'Connected' : 'Local'}\`);\n`;
    enhanced += `});\n\n`;
    
    enhanced += `module.exports = app;`;
    
    return enhanced;
}

// Generate Real CRUD Endpoints
function generateRealCRUDEndpoints(table) {
    const tableName = table.name;
    const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    
    let endpoints = `\n// ${tableName.toUpperCase()} CRUD Operations\n`;
    
    // GET all with pagination
    endpoints += `app.get('/api/${tableName}', async (req, res) => {\n`;
    endpoints += `  try {\n`;
    endpoints += `    const { page = 1, limit = 10, search } = req.query;\n`;
    endpoints += `    const offset = (page - 1) * limit;\n`;
    endpoints += `    \n`;
    endpoints += `    let query = 'SELECT * FROM ${tableName}';\n`;
    endpoints += `    const params = [];\n`;
    endpoints += `    \n`;
    endpoints += `    if (search) {\n`;
    endpoints += `      query += ' WHERE name ILIKE $1';\n`;
    endpoints += `      params.push(\`%\${search}%\`);\n`;
    endpoints += `    }\n`;
    endpoints += `    \n`;
    endpoints += `    query += \` ORDER BY id LIMIT \${limit} OFFSET \${offset}\`;\n`;
    endpoints += `    \n`;
    endpoints += `    const result = await pool.query(query, params);\n`;
    endpoints += `    const countResult = await pool.query('SELECT COUNT(*) FROM ${tableName}');\n`;
    endpoints += `    \n`;
    endpoints += `    res.json({\n`;
    endpoints += `      data: result.rows,\n`;
    endpoints += `      pagination: {\n`;
    endpoints += `        page: parseInt(page),\n`;
    endpoints += `        limit: parseInt(limit),\n`;
    endpoints += `        total: parseInt(countResult.rows[0].count)\n`;
    endpoints += `      }\n`;
    endpoints += `    });\n`;
    endpoints += `  } catch (error) {\n`;
    endpoints += `    res.status(500).json({ error: error.message });\n`;
    endpoints += `  }\n`;
    endpoints += `});\n\n`;
    
    // GET by ID
    endpoints += `app.get('/api/${tableName}/:id', async (req, res) => {\n`;
    endpoints += `  try {\n`;
    endpoints += `    const { id } = req.params;\n`;
    endpoints += `    const result = await pool.query('SELECT * FROM ${tableName} WHERE id = $1', [id]);\n`;
    endpoints += `    \n`;
    endpoints += `    if (result.rows.length === 0) {\n`;
    endpoints += `      return res.status(404).json({ error: '${singularName} not found' });\n`;
    endpoints += `    }\n`;
    endpoints += `    \n`;
    endpoints += `    res.json(result.rows[0]);\n`;
    endpoints += `  } catch (error) {\n`;
    endpoints += `    res.status(500).json({ error: error.message });\n`;
    endpoints += `  }\n`;
    endpoints += `});\n\n`;
    
    // POST create
    endpoints += `app.post('/api/${tableName}', async (req, res) => {\n`;
    endpoints += `  try {\n`;
    endpoints += `    const data = req.body;\n`;
    endpoints += `    const columns = Object.keys(data).join(', ');\n`;
    endpoints += `    const values = Object.values(data);\n`;
    endpoints += `    const placeholders = values.map((_, i) => \`$\${i + 1}\`).join(', ');\n`;
    endpoints += `    \n`;
    endpoints += `    const query = \`INSERT INTO ${tableName} (\${columns}) VALUES (\${placeholders}) RETURNING *\`;\n`;
    endpoints += `    const result = await pool.query(query, values);\n`;
    endpoints += `    \n`;
    endpoints += `    res.status(201).json(result.rows[0]);\n`;
    endpoints += `  } catch (error) {\n`;
    endpoints += `    res.status(400).json({ error: error.message });\n`;
    endpoints += `  }\n`;
    endpoints += `});\n\n`;
    
    // PUT update
    endpoints += `app.put('/api/${tableName}/:id', async (req, res) => {\n`;
    endpoints += `  try {\n`;
    endpoints += `    const { id } = req.params;\n`;
    endpoints += `    const data = req.body;\n`;
    endpoints += `    \n`;
    endpoints += `    const setClause = Object.keys(data).map((key, i) => \`\${key} = $\${i + 2}\`).join(', ');\n`;
    endpoints += `    const values = [id, ...Object.values(data)];\n`;
    endpoints += `    \n`;
    endpoints += `    const query = \`UPDATE ${tableName} SET \${setClause} WHERE id = $1 RETURNING *\`;\n`;
    endpoints += `    const result = await pool.query(query, values);\n`;
    endpoints += `    \n`;
    endpoints += `    if (result.rows.length === 0) {\n`;
    endpoints += `      return res.status(404).json({ error: '${singularName} not found' });\n`;
    endpoints += `    }\n`;
    endpoints += `    \n`;
    endpoints += `    res.json(result.rows[0]);\n`;
    endpoints += `  } catch (error) {\n`;
    endpoints += `    res.status(400).json({ error: error.message });\n`;
    endpoints += `  }\n`;
    endpoints += `});\n\n`;
    
    // DELETE
    endpoints += `app.delete('/api/${tableName}/:id', async (req, res) => {\n`;
    endpoints += `  try {\n`;
    endpoints += `    const { id } = req.params;\n`;
    endpoints += `    const result = await pool.query('DELETE FROM ${tableName} WHERE id = $1 RETURNING *', [id]);\n`;
    endpoints += `    \n`;
    endpoints += `    if (result.rows.length === 0) {\n`;
    endpoints += `      return res.status(404).json({ error: '${singularName} not found' });\n`;
    endpoints += `    }\n`;
    endpoints += `    \n`;
    endpoints += `    res.json({ message: '${singularName} deleted successfully' });\n`;
    endpoints += `  } catch (error) {\n`;
    endpoints += `    res.status(500).json({ error: error.message });\n`;
    endpoints += `  }\n`;
    endpoints += `});\n`;
    
    return endpoints;
}