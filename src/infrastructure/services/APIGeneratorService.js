class APIGeneratorService {
  constructor(llmService) {
    this.llmService = llmService;
  }

  async generateCode(apiSpec) {
    const expressCode = await this.generateExpressAPI(apiSpec);
    const packageJson = this.generatePackageJson(apiSpec.name);
    const dockerFile = this.generateDockerfile();
    const envFile = this.generateEnvFile();

    return {
      'app.js': expressCode,
      'package.json': packageJson,
      'Dockerfile': dockerFile,
      '.env.example': envFile,
      'README.md': this.generateReadme(apiSpec)
    };
  }

  async generateAPICode(input) {
    if (typeof input === 'string' || input.sql) {
      // Handle SQL string input
      return await this.llmService.generateAPICode(input);
    }
    
    // Handle API spec object
    const result = await this.generateCode(input);
    return result['app.js'];
  }

  async generateExpressAPI(apiSpec) {
    return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

${this.generateRoutes(apiSpec)}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`${apiSpec.name} API running on port \${PORT}\`);
});

module.exports = app;`;
  }

  generateRoutes(apiSpec) {
    const routes = [];
    
    // Group endpoints by table/resource
    const resourceGroups = {};
    apiSpec.endpoints.forEach(endpoint => {
      const resource = endpoint.path.split('/')[1];
      if (!resourceGroups[resource]) {
        resourceGroups[resource] = [];
      }
      resourceGroups[resource].push(endpoint);
    });

    Object.entries(resourceGroups).forEach(([resource, endpoints]) => {
      routes.push(`
// ${resource.toUpperCase()} Routes
${endpoints.map(endpoint => this.generateRoute(resource, endpoint)).join('\n')}
`);
    });

    return routes.join('\n');
  }

  generateRoute(resource, endpoint) {
    const method = endpoint.method.toLowerCase();
    const path = endpoint.path.replace(`/${resource}`, '');
    const hasAuth = endpoint.security && endpoint.security.length > 0;
    const middleware = hasAuth ? 'authenticateToken, ' : '';

    switch (method) {
      case 'get':
        if (path.includes('{id}')) {
          return `app.get('/api/${resource}/:id', ${middleware}async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('${resource}')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: '${resource} not found' });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;
        } else {
          return `app.get('/api/${resource}', ${middleware}async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('${resource}')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;
        }

      case 'post':
        return `app.post('/api/${resource}', ${middleware}async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('${resource}')
      .insert(req.body)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

      case 'put':
        return `app.put('/api/${resource}/:id', ${middleware}async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('${resource}')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: '${resource} not found' });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

      case 'delete':
        return `app.delete('/api/${resource}/:id', ${middleware}async (req, res) => {
  try {
    const { error } = await supabase
      .from('${resource}')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

      default:
        return `// ${method.toUpperCase()} ${endpoint.path} - Not implemented`;
    }
  }

  generatePackageJson(apiName) {
    return JSON.stringify({
      name: apiName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `Generated API for ${apiName}`,
      main: 'app.js',
      scripts: {
        start: 'node app.js',
        dev: 'nodemon app.js',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.2',
        '@supabase/supabase-js': '^2.38.0',
        cors: '^2.8.5',
        helmet: '^7.1.0',
        'express-rate-limit': '^7.1.5',
        jsonwebtoken: '^9.0.2',
        dotenv: '^16.3.1'
      },
      devDependencies: {
        nodemon: '^3.0.1',
        jest: '^29.7.0'
      }
    }, null, 2);
  }

  generateDockerfile() {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]`;
  }

  generateEnvFile() {
    return `# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=3000
NODE_ENV=production`;
  }

  generateReadme(apiSpec) {
    return `# ${apiSpec.name} API

Generated API for ${apiSpec.name} using AI-Powered Database-to-API Agent.

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## API Endpoints

${apiSpec.endpoints.map(endpoint => 
  `- \`${endpoint.method.toUpperCase()} ${endpoint.path}\` - ${endpoint.operation}`
).join('\n')}

## Authentication

This API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address.

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error message description"
}
\`\`\`

## Health Check

Check API health at \`GET /health\`
`;
  }
}

module.exports = APIGeneratorService;