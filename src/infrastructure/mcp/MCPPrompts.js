class MCPPrompts {
    constructor(services) {
        this.openaiService = services.openaiService;
    }

    getPrompts() {
        return [
            {
                name: 'analyze_erd',
                description: 'Generate prompts for ERD analysis and schema generation',
                handler: this.analyzeERDPrompt.bind(this)
            },
            {
                name: 'optimize_schema',
                description: 'Generate prompts for database schema optimization',
                handler: this.optimizeSchemaPrompt.bind(this)
            },
            {
                name: 'generate_api_docs',
                description: 'Generate prompts for API documentation creation',
                handler: this.generateAPIDocsPrompt.bind(this)
            },
            {
                name: 'security_review',
                description: 'Generate prompts for security analysis of database and API',
                handler: this.securityReviewPrompt.bind(this)
            },
            {
                name: 'performance_analysis',
                description: 'Generate prompts for performance optimization analysis',
                handler: this.performanceAnalysisPrompt.bind(this)
            },
            {
                name: 'migration_strategy',
                description: 'Generate prompts for database migration planning',
                handler: this.migrationStrategyPrompt.bind(this)
            }
        ];
    }

    async analyzeERDPrompt(args) {
        const { imageDescription, complexity = 'medium', focus = 'general' } = args || {};
        
        const basePrompt = `You are an expert database architect analyzing an Entity Relationship Diagram (ERD). 
Your task is to extract and generate a comprehensive database schema.`;

        const focusPrompts = {
            general: 'Focus on identifying all entities, attributes, and relationships.',
            performance: 'Focus on indexing strategies and query optimization opportunities.',
            security: 'Focus on data security, access control, and sensitive information handling.',
            scalability: 'Focus on scalability patterns and potential bottlenecks.'
        };

        const complexityInstructions = {
            simple: 'This is a simple ERD with basic entities and relationships.',
            medium: 'This is a moderately complex ERD with multiple entities and various relationship types.',
            complex: 'This is a complex ERD with many entities, complex relationships, and advanced features.'
        };

        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `${basePrompt}

${complexityInstructions[complexity]}
${focusPrompts[focus]}

Please analyze the ERD and provide:
1. Complete SQL schema with proper data types
2. Primary and foreign key relationships
3. Indexes for optimal performance
4. Constraints and validation rules
5. Any normalization recommendations

${imageDescription ? `Additional context: ${imageDescription}` : ''}`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: 'Please analyze the provided ERD image and generate the database schema.'
                    }
                }
            ]
        };
    }

    async optimizeSchemaPrompt(args) {
        const { schema, performanceGoals = [], currentIssues = [] } = args || {};
        
        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a database optimization expert. Analyze the provided schema and suggest improvements.

Focus areas:
- Indexing strategy optimization
- Query performance improvements
- Storage efficiency
- Normalization/denormalization opportunities
- Constraint optimization

Performance Goals: ${performanceGoals.join(', ') || 'General optimization'}
Current Issues: ${currentIssues.join(', ') || 'None specified'}`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please optimize this database schema:

\`\`\`sql
${schema || 'No schema provided'}
\`\`\`

Provide specific recommendations with explanations and optimized SQL.`
                    }
                }
            ]
        };
    }

    async generateAPIDocsPrompt(args) {
        const { apiSpec, framework = 'express', includeExamples = true } = args || {};
        
        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are an API documentation expert. Generate comprehensive documentation for the provided API specification.

Framework: ${framework}
Include Examples: ${includeExamples}

Generate:
1. OpenAPI/Swagger specification
2. Endpoint descriptions with parameters
3. Request/response examples
4. Authentication requirements
5. Error handling documentation
6. Rate limiting information`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Generate documentation for this API:

${apiSpec || 'No API specification provided'}

Make it comprehensive and developer-friendly.`
                    }
                }
            ]
        };
    }

    async securityReviewPrompt(args) {
        const { schema, apiCode, securityLevel = 'standard' } = args || {};
        
        const securityLevels = {
            basic: 'Focus on fundamental security practices',
            standard: 'Include comprehensive security analysis',
            enterprise: 'Apply enterprise-grade security standards and compliance requirements'
        };

        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a cybersecurity expert specializing in database and API security.

Security Level: ${securityLevels[securityLevel]}

Analyze for:
1. SQL injection vulnerabilities
2. Authentication and authorization flaws
3. Data exposure risks
4. Input validation issues
5. Access control problems
6. Encryption requirements
7. Compliance considerations (GDPR, HIPAA, etc.)`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Perform a security review of:

Database Schema:
\`\`\`sql
${schema || 'No schema provided'}
\`\`\`

API Code:
\`\`\`javascript
${apiCode || 'No API code provided'}
\`\`\`

Identify vulnerabilities and provide remediation steps.`
                    }
                }
            ]
        };
    }

    async performanceAnalysisPrompt(args) {
        const { schema, queries = [], expectedLoad = 'medium' } = args || {};
        
        const loadProfiles = {
            low: 'Low traffic (< 1000 requests/day)',
            medium: 'Medium traffic (1K-100K requests/day)',
            high: 'High traffic (100K-1M requests/day)',
            enterprise: 'Enterprise scale (> 1M requests/day)'
        };

        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a database performance optimization expert.

Expected Load: ${loadProfiles[expectedLoad]}

Analyze for:
1. Query performance bottlenecks
2. Index optimization opportunities
3. Caching strategies
4. Connection pooling recommendations
5. Scaling strategies
6. Monitoring requirements`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Analyze performance for:

Schema:
\`\`\`sql
${schema || 'No schema provided'}
\`\`\`

Common Queries:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n') || 'No queries provided'}

Provide optimization recommendations and performance tuning strategies.`
                    }
                }
            ]
        };
    }

    async migrationStrategyPrompt(args) {
        const { currentSchema, targetSchema, migrationGoals = [] } = args || {};
        
        return {
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a database migration expert. Plan a safe and efficient migration strategy.

Migration Goals: ${migrationGoals.join(', ') || 'Schema update'}

Consider:
1. Data preservation and integrity
2. Downtime minimization
3. Rollback strategies
4. Testing procedures
5. Performance impact
6. Risk mitigation`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Plan migration from:

Current Schema:
\`\`\`sql
${currentSchema || 'No current schema provided'}
\`\`\`

Target Schema:
\`\`\`sql
${targetSchema || 'No target schema provided'}
\`\`\`

Provide a detailed migration plan with steps, risks, and mitigation strategies.`
                    }
                }
            ]
        };
    }
}

module.exports = MCPPrompts;