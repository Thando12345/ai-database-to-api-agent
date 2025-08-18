const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

class MVPController {
    constructor(imageToSchemaUseCase, schemaToAPIUseCase, speechService) {
        this.imageToSchemaUseCase = imageToSchemaUseCase;
        this.schemaToAPIUseCase = schemaToAPIUseCase;
        this.speechService = speechService;
    }

    // Core MVP: Image to Schema (5-minute workflow)
    analyzeERDImage() {
        return [upload.single('erdImage'), async (req, res) => {
            try {
                const startTime = Date.now();
                
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        error: 'No image file provided'
                    });
                }

                // Extract entities from image using AI
                const analysis = await this.extractEntitiesFromImage(req.file.buffer);
                
                // Generate SQL schema
                const schema = this.generateSQLFromEntities(analysis.entities);
                
                // Calculate processing time
                const processingTime = Date.now() - startTime;
                
                res.json({
                    success: true,
                    data: {
                        entities: analysis.entities,
                        relationships: analysis.relationships,
                        schema: schema,
                        accuracy: analysis.confidence,
                        processingTime: processingTime
                    }
                });

            } catch (error) {
                console.error('ERD analysis error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to analyze ERD image'
                });
            }
        }];
    }

    // Core MVP: Schema to API (CRUD generation)
    generateAPIFromSchema() {
        return async (req, res) => {
            try {
                const { schema, framework = 'express' } = req.body;
                
                if (!schema) {
                    return res.status(400).json({
                        success: false,
                        error: 'Schema is required'
                    });
                }

                // Parse schema to extract tables
                const tables = this.parseSchemaToTables(schema);
                
                // Generate API code
                const apiCode = this.generateCRUDAPI(tables, framework);
                
                // Generate Postman collection
                const postmanCollection = this.generatePostmanCollection(tables);
                
                res.json({
                    success: true,
                    data: {
                        apiCode: apiCode,
                        endpoints: this.extractEndpoints(tables),
                        postmanCollection: postmanCollection,
                        framework: framework
                    }
                });

            } catch (error) {
                console.error('API generation error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate API'
                });
            }
        };
    }

    // Voice to ERD workflow
    processVoiceDescription() {
        return [upload.single('audio'), async (req, res) => {
            try {
                let description;
                
                if (req.file) {
                    // Process audio file
                    description = await this.speechService.transcribeAudio(req.file.buffer);
                } else if (req.body.description) {
                    // Use text description
                    description = req.body.description;
                } else {
                    return res.status(400).json({
                        success: false,
                        error: 'Audio file or text description required'
                    });
                }

                // Extract entities from description
                const entities = await this.extractEntitiesFromText(description);
                
                // Generate schema
                const schema = this.generateSQLFromEntities(entities);
                
                res.json({
                    success: true,
                    data: {
                        transcription: description,
                        entities: entities,
                        schema: schema
                    }
                });

            } catch (error) {
                console.error('Voice processing error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process voice description'
                });
            }
        }];
    }

    // Helper: Extract entities from image (simplified AI processing)
    async extractEntitiesFromImage(imageBuffer) {
        // Simulate AI processing with realistic delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock entity extraction (in real implementation, use OpenAI Vision API)
        const entities = [
            {
                name: 'users',
                attributes: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE', 'NOT NULL'] },
                    { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE', 'NOT NULL'] },
                    { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
                ]
            },
            {
                name: 'posts',
                attributes: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(id)'] },
                    { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
                    { name: 'content', type: 'TEXT', constraints: [] },
                    { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
                ]
            }
        ];

        const relationships = [
            {
                from: 'users',
                to: 'posts',
                type: 'one_to_many',
                foreign_key: 'user_id'
            }
        ];

        return {
            entities,
            relationships,
            confidence: 0.85
        };
    }

    // Helper: Extract entities from text description
    async extractEntitiesFromText(description) {
        // Simple keyword-based entity extraction
        const entities = [];
        const text = description.toLowerCase();
        
        // Common entity patterns
        const entityPatterns = {
            'user': ['user', 'customer', 'person', 'account'],
            'product': ['product', 'item', 'goods'],
            'order': ['order', 'purchase', 'transaction'],
            'category': ['category', 'type', 'classification']
        };

        Object.entries(entityPatterns).forEach(([entityType, patterns]) => {
            if (patterns.some(pattern => text.includes(pattern))) {
                entities.push({
                    name: entityType + 's',
                    attributes: this.getDefaultAttributes(entityType)
                });
            }
        });

        return entities.length > 0 ? entities : [
            {
                name: 'entities',
                attributes: this.getDefaultAttributes('entity')
            }
        ];
    }

    // Helper: Generate SQL from entities
    generateSQLFromEntities(entities) {
        return entities.map(entity => {
            const columns = entity.attributes.map(attr => {
                const constraints = attr.constraints ? ' ' + attr.constraints.join(' ') : '';
                return `  ${attr.name} ${attr.type}${constraints}`;
            }).join(',\n');
            
            return `CREATE TABLE ${entity.name} (\n${columns}\n);`;
        }).join('\n\n');
    }

    // Helper: Parse SQL schema to extract tables
    parseSchemaToTables(schema) {
        const tables = [];
        const tableMatches = schema.match(/CREATE TABLE (\w+)\s*\(([^;]+)\);/gi);
        
        if (tableMatches) {
            tableMatches.forEach(tableMatch => {
                const nameMatch = tableMatch.match(/CREATE TABLE (\w+)/i);
                if (nameMatch) {
                    const tableName = nameMatch[1];
                    const columnsText = tableMatch.match(/\(([^)]+)\)/)[1];
                    const columns = columnsText.split(',').map(col => col.trim().split(/\s+/)[0]);
                    
                    tables.push({
                        name: tableName,
                        columns: columns
                    });
                }
            });
        }
        
        return tables;
    }

    // Helper: Generate CRUD API code
    generateCRUDAPI(tables, framework) {
        if (framework === 'express') {
            return this.generateExpressAPI(tables);
        }
        // Add other frameworks later
        return this.generateExpressAPI(tables);
    }

    // Helper: Generate Express.js API
    generateExpressAPI(tables) {
        let code = `const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

`;

        tables.forEach(table => {
            const tableName = table.name;
            const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
            
            code += `// ${tableName} endpoints
app.get('/api/${tableName}', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ${tableName}');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/${tableName}/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM ${tableName} WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '${singularName} not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/${tableName}', async (req, res) => {
    try {
        const columns = Object.keys(req.body).filter(key => key !== 'id');
        const values = columns.map(col => req.body[col]);
        const placeholders = columns.map((_, i) => '$' + (i + 1)).join(', ');
        
        const query = \`INSERT INTO ${tableName} (\${columns.join(', ')}) VALUES (\${placeholders}) RETURNING *\`;
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/${tableName}/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const columns = Object.keys(req.body).filter(key => key !== 'id');
        const values = columns.map(col => req.body[col]);
        const setClause = columns.map((col, i) => \`\${col} = $\${i + 1}\`).join(', ');
        
        const query = \`UPDATE ${tableName} SET \${setClause} WHERE id = $\${columns.length + 1} RETURNING *\`;
        const result = await pool.query(query, [...values, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '${singularName} not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/${tableName}/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM ${tableName} WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '${singularName} not found' });
        }
        res.json({ message: '${singularName} deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

`;
        });

        code += `const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`API server running on port \${PORT}\`);
});

module.exports = app;`;

        return code;
    }

    // Helper: Extract API endpoints
    extractEndpoints(tables) {
        const endpoints = [];
        
        tables.forEach(table => {
            const tableName = table.name;
            endpoints.push(
                { method: 'GET', path: `/api/${tableName}`, description: `Get all ${tableName}` },
                { method: 'GET', path: `/api/${tableName}/:id`, description: `Get ${tableName} by ID` },
                { method: 'POST', path: `/api/${tableName}`, description: `Create new ${tableName.slice(0, -1)}` },
                { method: 'PUT', path: `/api/${tableName}/:id`, description: `Update ${tableName.slice(0, -1)}` },
                { method: 'DELETE', path: `/api/${tableName}/:id`, description: `Delete ${tableName.slice(0, -1)}` }
            );
        });
        
        return endpoints;
    }

    // Helper: Generate Postman collection
    generatePostmanCollection(tables) {
        const collection = {
            info: {
                name: "Generated API Collection",
                description: "Auto-generated from ERD analysis"
            },
            item: []
        };

        tables.forEach(table => {
            const tableName = table.name;
            const folderItem = {
                name: tableName,
                item: [
                    {
                        name: `Get all ${tableName}`,
                        request: {
                            method: "GET",
                            url: `{{baseUrl}}/api/${tableName}`
                        }
                    },
                    {
                        name: `Get ${tableName} by ID`,
                        request: {
                            method: "GET",
                            url: `{{baseUrl}}/api/${tableName}/1`
                        }
                    },
                    {
                        name: `Create ${tableName.slice(0, -1)}`,
                        request: {
                            method: "POST",
                            url: `{{baseUrl}}/api/${tableName}`,
                            header: [
                                {
                                    key: "Content-Type",
                                    value: "application/json"
                                }
                            ],
                            body: {
                                mode: "raw",
                                raw: JSON.stringify(this.generateSampleData(table))
                            }
                        }
                    }
                ]
            };
            collection.item.push(folderItem);
        });

        return collection;
    }

    // Helper: Generate sample data for Postman
    generateSampleData(table) {
        const sampleData = {};
        
        table.columns.forEach(column => {
            if (column === 'id') return; // Skip ID for creation
            
            if (column.includes('email')) {
                sampleData[column] = 'user@example.com';
            } else if (column.includes('name')) {
                sampleData[column] = 'Sample Name';
            } else if (column.includes('title')) {
                sampleData[column] = 'Sample Title';
            } else if (column.includes('content')) {
                sampleData[column] = 'Sample content text';
            } else {
                sampleData[column] = 'sample_value';
            }
        });
        
        return sampleData;
    }

    // Helper: Get default attributes for entity types
    getDefaultAttributes(entityType) {
        const attributeMap = {
            'user': [
                { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE'] },
                { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] },
                { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
            ],
            'product': [
                { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
                { name: 'price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] },
                { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
            ],
            'order': [
                { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(id)'] },
                { name: 'total', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] },
                { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
            ]
        };

        return attributeMap[entityType] || [
            { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
            { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
            { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
        ];
    }
}

module.exports = MVPController;