class MCPTools {
    constructor(services) {
        this.imageToSchemaUseCase = services.imageToSchemaUseCase;
        this.voiceToERDUseCase = services.voiceToERDUseCase;
        this.schemaToAPIUseCase = services.schemaToAPIUseCase;
        this.databaseService = services.databaseService;
        this.apiGeneratorService = services.apiGeneratorService;
    }

    getTools() {
        return [
            {
                name: 'analyze_erd_image',
                schema: {
                    description: 'Analyze ERD image and generate database schema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            imageData: {
                                type: 'string',
                                description: 'Base64 encoded image data'
                            },
                            format: {
                                type: 'string',
                                enum: ['sql', 'json'],
                                default: 'sql',
                                description: 'Output format for schema'
                            }
                        },
                        required: ['imageData']
                    }
                },
                handler: this.analyzeERDImage.bind(this)
            },
            {
                name: 'process_voice_description',
                schema: {
                    description: 'Convert voice description to database schema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            audioData: {
                                type: 'string',
                                description: 'Base64 encoded audio data'
                            },
                            format: {
                                type: 'string',
                                enum: ['wav', 'mp3', 'ogg'],
                                default: 'wav',
                                description: 'Audio format'
                            }
                        },
                        required: ['audioData']
                    }
                },
                handler: this.processVoiceDescription.bind(this)
            },
            {
                name: 'generate_api',
                schema: {
                    description: 'Generate REST API from database schema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            schema: {
                                type: 'string',
                                description: 'Database schema (SQL or JSON)'
                            },
                            framework: {
                                type: 'string',
                                enum: ['express', 'fastify', 'koa'],
                                default: 'express',
                                description: 'API framework'
                            },
                            includeAuth: {
                                type: 'boolean',
                                default: true,
                                description: 'Include authentication endpoints'
                            }
                        },
                        required: ['schema']
                    }
                },
                handler: this.generateAPI.bind(this)
            },
            {
                name: 'deploy_database',
                schema: {
                    description: 'Deploy database schema to target environment',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            schema: {
                                type: 'string',
                                description: 'SQL schema to deploy'
                            },
                            environment: {
                                type: 'string',
                                enum: ['development', 'staging', 'production'],
                                default: 'development',
                                description: 'Target environment'
                            }
                        },
                        required: ['schema']
                    }
                },
                handler: this.deployDatabase.bind(this)
            },
            {
                name: 'validate_schema',
                schema: {
                    description: 'Validate database schema for best practices',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            schema: {
                                type: 'string',
                                description: 'Database schema to validate'
                            },
                            strict: {
                                type: 'boolean',
                                default: false,
                                description: 'Enable strict validation rules'
                            }
                        },
                        required: ['schema']
                    }
                },
                handler: this.validateSchema.bind(this)
            },
            {
                name: 'optimize_queries',
                schema: {
                    description: 'Analyze and optimize database queries',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            queries: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'SQL queries to optimize'
                            },
                            schema: {
                                type: 'string',
                                description: 'Database schema context'
                            }
                        },
                        required: ['queries']
                    }
                },
                handler: this.optimizeQueries.bind(this)
            }
        ];
    }

    async analyzeERDImage(args) {
        const { imageData, format = 'sql' } = args;
        
        try {
            const result = await this.imageToSchemaUseCase.execute({
                imageData: Buffer.from(imageData, 'base64'),
                format
            });
            
            return {
                success: true,
                schema: result.schema,
                tables: result.tables,
                relationships: result.relationships,
                format
            };
        } catch (error) {
            throw new Error(`ERD analysis failed: ${error.message}`);
        }
    }

    async processVoiceDescription(args) {
        const { audioData, format = 'wav' } = args;
        
        try {
            const result = await this.voiceToERDUseCase.execute({
                audioBuffer: Buffer.from(audioData, 'base64'),
                format
            });
            
            return {
                success: true,
                transcript: result.transcript,
                schema: result.schema,
                entities: result.entities
            };
        } catch (error) {
            throw new Error(`Voice processing failed: ${error.message}`);
        }
    }

    async generateAPI(args) {
        const { schema, framework = 'express', includeAuth = true } = args;
        
        try {
            const result = await this.schemaToAPIUseCase.execute({
                schema,
                framework,
                includeAuth
            });
            
            return {
                success: true,
                apiCode: result.code,
                endpoints: result.endpoints,
                documentation: result.documentation,
                framework
            };
        } catch (error) {
            throw new Error(`API generation failed: ${error.message}`);
        }
    }

    async deployDatabase(args) {
        const { schema, environment = 'development' } = args;
        
        try {
            const result = await this.databaseService.deploySchema(schema, environment);
            
            return {
                success: true,
                deploymentId: result.id,
                connectionString: result.connectionString,
                environment,
                tablesCreated: result.tables
            };
        } catch (error) {
            throw new Error(`Database deployment failed: ${error.message}`);
        }
    }

    async validateSchema(args) {
        const { schema, strict = false } = args;
        
        try {
            const validation = await this.databaseService.validateSchema(schema, { strict });
            
            return {
                valid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions,
                score: validation.score
            };
        } catch (error) {
            throw new Error(`Schema validation failed: ${error.message}`);
        }
    }

    async optimizeQueries(args) {
        const { queries, schema } = args;
        
        try {
            const optimizations = await this.databaseService.optimizeQueries(queries, schema);
            
            return {
                success: true,
                optimizations: optimizations.map(opt => ({
                    original: opt.original,
                    optimized: opt.optimized,
                    improvement: opt.improvement,
                    explanation: opt.explanation
                }))
            };
        } catch (error) {
            throw new Error(`Query optimization failed: ${error.message}`);
        }
    }
}

module.exports = MCPTools;