class MCPResources {
    constructor(services) {
        this.databaseService = services.databaseService;
        this.supabaseService = services.supabaseService;
    }

    getResources() {
        return [
            {
                uri: 'database://schemas/list',
                mimeType: 'application/json',
                handler: this.getSchemasList.bind(this)
            },
            {
                uri: 'database://schemas/active',
                mimeType: 'application/json',
                handler: this.getActiveSchema.bind(this)
            },
            {
                uri: 'api://specs/list',
                mimeType: 'application/json',
                handler: this.getAPISpecs.bind(this)
            },
            {
                uri: 'api://deployments/list',
                mimeType: 'application/json',
                handler: this.getDeployments.bind(this)
            },
            {
                uri: 'templates://sql/common',
                mimeType: 'text/plain',
                handler: this.getSQLTemplates.bind(this)
            },
            {
                uri: 'templates://api/express',
                mimeType: 'text/plain',
                handler: this.getExpressTemplate.bind(this)
            },
            {
                uri: 'docs://best-practices',
                mimeType: 'text/markdown',
                handler: this.getBestPractices.bind(this)
            },
            {
                uri: 'logs://recent',
                mimeType: 'application/json',
                handler: this.getRecentLogs.bind(this)
            }
        ];
    }

    async getSchemasList() {
        try {
            const schemas = await this.supabaseService.getSchemas();
            return {
                schemas: schemas.map(schema => ({
                    id: schema.id,
                    name: schema.name,
                    description: schema.description,
                    createdAt: schema.created_at,
                    tablesCount: schema.tables?.length || 0,
                    status: schema.status
                })),
                total: schemas.length,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to fetch schemas: ${error.message}`);
        }
    }

    async getActiveSchema() {
        try {
            const activeSchema = await this.supabaseService.getActiveSchema();
            if (!activeSchema) {
                return { message: 'No active schema found' };
            }

            return {
                id: activeSchema.id,
                name: activeSchema.name,
                description: activeSchema.description,
                sql: activeSchema.sql_content,
                tables: activeSchema.tables,
                relationships: activeSchema.relationships,
                createdAt: activeSchema.created_at,
                updatedAt: activeSchema.updated_at
            };
        } catch (error) {
            throw new Error(`Failed to fetch active schema: ${error.message}`);
        }
    }

    async getAPISpecs() {
        try {
            const specs = await this.supabaseService.getAPISpecs();
            return {
                specs: specs.map(spec => ({
                    id: spec.id,
                    name: spec.name,
                    version: spec.version,
                    framework: spec.framework,
                    endpoints: spec.endpoints?.length || 0,
                    status: spec.status,
                    createdAt: spec.created_at
                })),
                total: specs.length
            };
        } catch (error) {
            throw new Error(`Failed to fetch API specs: ${error.message}`);
        }
    }

    async getDeployments() {
        try {
            const deployments = await this.supabaseService.getDeployments();
            return {
                deployments: deployments.map(deployment => ({
                    id: deployment.id,
                    environment: deployment.environment,
                    status: deployment.status,
                    url: deployment.url,
                    version: deployment.version,
                    deployedAt: deployment.deployed_at,
                    health: deployment.health_status
                })),
                total: deployments.length
            };
        } catch (error) {
            throw new Error(`Failed to fetch deployments: ${error.message}`);
        }
    }

    async getSQLTemplates() {
        return `-- Common SQL Templates for Database-to-API Agent

-- User Management Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Template
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generic Entity Template
CREATE TABLE {entity_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Indexes Template
CREATE INDEX idx_{table}_{column} ON {table}({column});
CREATE INDEX idx_{table}_created_at ON {table}(created_at);
CREATE INDEX idx_{table}_status ON {table}(status);

-- RLS Policy Template
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{table}_policy" ON {table}
    FOR ALL USING (auth.uid() = user_id);`;
    }

    async getExpressTemplate() {
        return `// Express.js API Template for Database-to-API Agent

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
};

// Generic CRUD routes template
const createCRUDRoutes = (tableName) => {
    const router = express.Router();
    
    // GET /api/{table} - List all records
    router.get('/', authenticate, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.json({ data, count: data.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // GET /api/{table}/:id - Get single record
    router.get('/:id', authenticate, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', req.params.id)
                .single();
            
            if (error) throw error;
            res.json({ data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // POST /api/{table} - Create new record
    router.post('/', authenticate, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert([{ ...req.body, created_by: req.user.id }])
                .select()
                .single();
            
            if (error) throw error;
            res.status(201).json({ data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // PUT /api/{table}/:id - Update record
    router.put('/:id', authenticate, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .update({ ...req.body, updated_by: req.user.id, updated_at: new Date() })
                .eq('id', req.params.id)
                .select()
                .single();
            
            if (error) throw error;
            res.json({ data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // DELETE /api/{table}/:id - Delete record
    router.delete('/:id', authenticate, async (req, res) => {
        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', req.params.id);
            
            if (error) throw error;
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    return router;
};

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export for dynamic route registration
module.exports = { app, createCRUDRoutes, authenticate };`;
    }

    async getBestPractices() {
        return `# Database-to-API Best Practices

## Database Design

### Schema Design
- Use UUIDs for primary keys for better scalability
- Include created_at and updated_at timestamps on all tables
- Add soft delete columns (deleted_at) instead of hard deletes
- Use JSONB for flexible metadata storage
- Implement proper foreign key constraints

### Indexing Strategy
- Index frequently queried columns
- Create composite indexes for multi-column queries
- Index foreign keys for better join performance
- Monitor and optimize slow queries regularly

### Security
- Enable Row Level Security (RLS) on all tables
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Audit sensitive operations

## API Design

### RESTful Principles
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate HTTP status codes
- Implement consistent error handling
- Use meaningful resource names

### Performance
- Implement pagination for large datasets
- Use caching strategies (Redis, CDN)
- Optimize database queries
- Implement rate limiting

### Security
- Use HTTPS for all communications
- Implement JWT token authentication
- Validate all input data
- Log security events

### Documentation
- Use OpenAPI/Swagger specifications
- Provide clear endpoint descriptions
- Include request/response examples
- Document authentication requirements

## Deployment

### Environment Management
- Use environment variables for configuration
- Separate development, staging, and production
- Implement proper CI/CD pipelines
- Monitor application health

### Monitoring
- Set up application logging
- Monitor database performance
- Track API response times
- Implement alerting for critical issues`;
    }

    async getRecentLogs() {
        try {
            const logs = await this.supabaseService.getAuditLogs({ limit: 50 });
            return {
                logs: logs.map(log => ({
                    id: log.id,
                    operation: log.operation,
                    tableName: log.table_name,
                    userId: log.user_id,
                    timestamp: log.timestamp,
                    changes: log.new_values ? Object.keys(log.new_values).length : 0
                })),
                total: logs.length,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to fetch logs: ${error.message}`);
        }
    }
}

module.exports = MCPResources;