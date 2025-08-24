const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

class SwaggerController {
    constructor() {
        this.options = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'AI Database-to-API Agent',
                    version: '1.0.0',
                    description: 'Auto-generated REST API from database schemas',
                    contact: {
                        name: 'AI Database Agent',
                        url: 'http://localhost:3000'
                    }
                },
                servers: [
                    {
                        url: 'http://localhost:3000',
                        description: 'Development server'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                }
            },
            apis: ['./src/presentation/controllers/*.js']
        };
        
        this.specs = swaggerJsdoc(this.options);
    }

    setupSwagger(app) {
        // Swagger UI setup
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(this.specs, {
            explorer: true,
            customCss: `
                .swagger-ui .topbar { display: none }
                .swagger-ui .info .title { color: #3b82f6 }
            `,
            customSiteTitle: "AI Database API Documentation"
        }));

        // JSON endpoint for API specs
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(this.specs);
        });
    }

    generateDynamicSchema(tables) {
        const paths = {};
        const components = { schemas: {} };

        tables.forEach(table => {
            const tableName = table.name;
            const schema = this.generateTableSchema(table);
            
            components.schemas[tableName] = schema;
            
            // Generate CRUD endpoints
            paths[`/api/${tableName}`] = {
                get: {
                    tags: [tableName],
                    summary: `Get all ${tableName}`,
                    responses: {
                        200: {
                            description: 'Success',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: `#/components/schemas/${tableName}` }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: [tableName],
                    summary: `Create new ${tableName}`,
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${tableName}` }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: 'Created',
                            content: {
                                'application/json': {
                                    schema: { $ref: `#/components/schemas/${tableName}` }
                                }
                            }
                        }
                    }
                }
            };

            paths[`/api/${tableName}/{id}`] = {
                get: {
                    tags: [tableName],
                    summary: `Get ${tableName} by ID`,
                    parameters: [{
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }],
                    responses: {
                        200: {
                            description: 'Success',
                            content: {
                                'application/json': {
                                    schema: { $ref: `#/components/schemas/${tableName}` }
                                }
                            }
                        }
                    }
                },
                put: {
                    tags: [tableName],
                    summary: `Update ${tableName}`,
                    parameters: [{
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${tableName}` }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: `#/components/schemas/${tableName}` }
                                }
                            }
                        }
                    }
                },
                delete: {
                    tags: [tableName],
                    summary: `Delete ${tableName}`,
                    parameters: [{
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'integer' }
                    }],
                    responses: {
                        204: { description: 'Deleted' }
                    }
                }
            };
        });

        return { paths, components };
    }

    generateTableSchema(table) {
        const properties = {};
        const required = [];

        table.columns.forEach(column => {
            properties[column.name] = {
                type: this.mapSqlTypeToSwagger(column.type),
                description: column.description || `${column.name} field`
            };

            if (column.nullable === false) {
                required.push(column.name);
            }
        });

        return {
            type: 'object',
            properties,
            required
        };
    }

    mapSqlTypeToSwagger(sqlType) {
        const typeMap = {
            'SERIAL': 'integer',
            'INTEGER': 'integer',
            'BIGINT': 'integer',
            'VARCHAR': 'string',
            'TEXT': 'string',
            'DATE': 'string',
            'TIMESTAMP': 'string',
            'BOOLEAN': 'boolean',
            'DECIMAL': 'number',
            'NUMERIC': 'number',
            'JSONB': 'object',
            'JSON': 'object'
        };

        return typeMap[sqlType.toUpperCase()] || 'string';
    }
}

module.exports = SwaggerController;