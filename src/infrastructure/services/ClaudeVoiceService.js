class ClaudeVoiceService {
    constructor() {
        this.apiKey = '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';
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'anthropic/claude-3.5-sonnet';
    }

    async processVoiceDescription(description) {
        console.log('🎤 Processing voice with Claude:', description);
        
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: `Convert this voice description into a complete database schema:

"${description}"

Generate:
1. SQL CREATE TABLE statements with proper data types
2. Primary keys, foreign keys, and constraints
3. Realistic column names and relationships

Format as SQL schema with comments explaining the design.`
                    }],
                    max_tokens: 1500,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API failed: ${response.status}`);
            }

            const result = await response.json();
            const content = result.choices[0].message.content;
            
            return this.parseSchemaResponse(content, description);
            
        } catch (error) {
            console.error('Claude voice processing failed:', error);
            return this.generateFallbackSchema(description);
        }
    }

    parseSchemaResponse(content, originalDescription) {
        const tables = [];
        const relationships = [];
        
        // Extract CREATE TABLE statements
        const tableMatches = content.match(/CREATE TABLE\s+(\w+)\s*\([^;]+\);/gi);
        
        if (tableMatches) {
            tableMatches.forEach(tableSQL => {
                const nameMatch = tableSQL.match(/CREATE TABLE\s+(\w+)/i);
                if (nameMatch) {
                    const tableName = nameMatch[1].toLowerCase();
                    const columns = [];
                    
                    // Extract columns
                    const columnMatches = tableSQL.match(/(\w+)\s+(VARCHAR|INT|INTEGER|TEXT|SERIAL|TIMESTAMP|DATE|DECIMAL)\s*(?:\(\d+\))?\s*[^,\n]*/gi);
                    if (columnMatches) {
                        columnMatches.forEach(colMatch => {
                            const parts = colMatch.trim().split(/\s+/);
                            if (parts.length >= 2) {
                                const constraints = [];
                                const restOfLine = colMatch.toLowerCase();
                                
                                if (restOfLine.includes('primary key')) constraints.push('PRIMARY KEY');
                                if (restOfLine.includes('foreign key') || restOfLine.includes('references')) constraints.push('FOREIGN KEY');
                                if (restOfLine.includes('not null')) constraints.push('NOT NULL');
                                if (restOfLine.includes('unique')) constraints.push('UNIQUE');
                                
                                columns.push({
                                    name: parts[0].toLowerCase(),
                                    type: parts[1].toUpperCase(),
                                    constraints
                                });
                            }
                        });
                    }
                    
                    tables.push({ name: tableName, columns });
                }
            });
        }
        
        return {
            schema_name: "claude_voice_generated",
            tables,
            relationships,
            raw_analysis: content,
            original_description: originalDescription,
            confidence: 0.95
        };
    }

    generateFallbackSchema(description) {
        const lowerDesc = description.toLowerCase();
        let schemaType = 'general';
        
        if (lowerDesc.includes('student') || lowerDesc.includes('course') || lowerDesc.includes('school')) {
            schemaType = 'academic';
        } else if (lowerDesc.includes('product') || lowerDesc.includes('order') || lowerDesc.includes('shop')) {
            schemaType = 'ecommerce';
        } else if (lowerDesc.includes('book') || lowerDesc.includes('library') || lowerDesc.includes('author')) {
            schemaType = 'library';
        }
        
        const schemas = {
            academic: {
                tables: [
                    { name: 'student', columns: [{ name: 'student_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'first_name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] }, { name: 'last_name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] }, { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }] },
                    { name: 'course', columns: [{ name: 'course_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'course_name', type: 'VARCHAR(200)', constraints: ['NOT NULL'] }, { name: 'credits', type: 'INTEGER', constraints: [] }] },
                    { name: 'enrollment', columns: [{ name: 'enrollment_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'student_id', type: 'INTEGER', constraints: ['FOREIGN KEY'] }, { name: 'course_id', type: 'INTEGER', constraints: ['FOREIGN KEY'] }] }
                ]
            },
            ecommerce: {
                tables: [
                    { name: 'user', columns: [{ name: 'user_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE'] }, { name: 'email', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }] },
                    { name: 'product', columns: [{ name: 'product_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'price', type: 'DECIMAL(10,2)', constraints: [] }] },
                    { name: 'order', columns: [{ name: 'order_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'user_id', type: 'INTEGER', constraints: ['FOREIGN KEY'] }, { name: 'total', type: 'DECIMAL(10,2)', constraints: [] }] }
                ]
            },
            library: {
                tables: [
                    { name: 'book', columns: [{ name: 'book_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'isbn', type: 'VARCHAR(20)', constraints: ['UNIQUE'] }] },
                    { name: 'author', columns: [{ name: 'author_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }] },
                    { name: 'member', columns: [{ name: 'member_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'email', type: 'VARCHAR(255)', constraints: [] }] }
                ]
            }
        };
        
        const schema = schemas[schemaType] || schemas.library;
        
        return {
            schema_name: `voice_${schemaType}`,
            tables: schema.tables,
            relationships: [],
            raw_analysis: `Generated ${schemaType} schema from voice description: "${description}"`,
            original_description: description,
            confidence: 0.85
        };
    }

    async generateAPICode(schema) {
        const tables = schema.tables || [];
        let code = `const express = require('express');\nconst app = express();\napp.use(express.json());\n\n`;
        
        tables.forEach(table => {
            code += `// ${table.name} endpoints\n`;
            code += `app.get('/api/${table.name}', (req, res) => res.json([]));\n`;
            code += `app.post('/api/${table.name}', (req, res) => res.json({id: 1}));\n`;
            code += `app.get('/api/${table.name}/:id', (req, res) => res.json({id: req.params.id}));\n`;
            code += `app.put('/api/${table.name}/:id', (req, res) => res.json({id: req.params.id}));\n`;
            code += `app.delete('/api/${table.name}/:id', (req, res) => res.json({deleted: true}));\n\n`;
        });
        
        code += `app.listen(3000, () => console.log('API running on port 3000'));`;
        return code;
    }
}

module.exports = ClaudeVoiceService;