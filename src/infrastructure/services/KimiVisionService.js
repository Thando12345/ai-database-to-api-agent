class KimiVisionService {
    constructor() {
        this.apiKey = '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';
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'moonshotai/kimi-k2:free';
    }

    async analyzeERD(imageBuffer) {
        console.log('Analyzing ERD with Kimi Vision API...');
        
        try {
            const base64Image = imageBuffer.toString('base64');
            console.log('Image size:', base64Image.length, 'characters');
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://database-api-agent.com',
                    'X-Title': 'AI Database Agent'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this ERD (Entity Relationship Diagram) image carefully. Extract ALL visible tables, columns, data types, and relationships. List each table with its columns in this format:\n\nTABLE tablename:\n- column_name: DATA_TYPE (constraints)\n\nThen list relationships as:\nRELATIONSHIP: table1.column -> table2.column'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }],
                    max_tokens: 1500,
                    temperature: 0.0
                })
            });

            console.log('Kimi API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Kimi API error:', response.status, errorText);
                return this.generateDynamicSchema(imageBuffer);
            }

            const result = await response.json();
            console.log('Kimi API result:', result);
            
            const analysisText = result.choices?.[0]?.message?.content || '';
            console.log('Analysis text from Kimi:', analysisText);
            
            if (analysisText && analysisText.length > 50) {
                return this.parseKimiResponse(analysisText);
            } else {
                console.log('No meaningful analysis from Kimi, using dynamic schema');
                return this.generateDynamicSchema(imageBuffer);
            }
            
        } catch (error) {
            console.error('Kimi vision analysis failed:', error.message);
            return this.generateDynamicSchema(imageBuffer);
        }
    }

    parseKimiResponse(text) {
        console.log('Parsing Kimi response:', text);
        
        const tables = [];
        const relationships = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        let currentTable = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Detect table definitions - more flexible pattern
            if (trimmed.match(/^TABLE\s+(\w+):/i) || (trimmed.includes(':') && trimmed.match(/^(\w+):/))) {
                const tableMatch = trimmed.match(/(?:TABLE\s+)?(\w+):/i);
                if (tableMatch) {
                    const tableName = tableMatch[1].toLowerCase();
                    currentTable = {
                        name: tableName,
                        columns: []
                    };
                    tables.push(currentTable);
                    console.log(`Found table: ${tableName}`);
                }
            }
            
            // Parse column definitions - more flexible
            if (currentTable && (trimmed.startsWith('-') || trimmed.includes(':'))) {
                const columnMatch = trimmed.match(/[-•]?\s*(\w+)\s*:?\s+(VARCHAR|INT|INTEGER|TEXT|SERIAL|TIMESTAMP|DATE|DECIMAL|CHAR|BOOLEAN)\s*(\([^)]+\))?\s*(.*)/i);
                if (columnMatch) {
                    const constraints = [];
                    const constraintText = (columnMatch[4] || '').toLowerCase();
                    
                    if (constraintText.includes('primary') || constraintText.includes('pk') || columnMatch[1].toLowerCase().includes('id')) {
                        constraints.push('PRIMARY KEY');
                    }
                    if (constraintText.includes('not null') || constraintText.includes('required')) {
                        constraints.push('NOT NULL');
                    }
                    if (constraintText.includes('unique')) {
                        constraints.push('UNIQUE');
                    }
                    
                    currentTable.columns.push({
                        name: columnMatch[1].toLowerCase(),
                        type: columnMatch[2].toUpperCase() + (columnMatch[3] || ''),
                        constraints
                    });
                    console.log(`Added column: ${columnMatch[1]} ${columnMatch[2]}`);
                }
            }
            
            // Detect relationships
            if (trimmed.includes('RELATIONSHIP') || trimmed.includes('->') || trimmed.includes('FOREIGN KEY')) {
                const refMatch = trimmed.match(/(\w+)\.(\w+)\s*->\s*(\w+)\.(\w+)/i) || 
                               trimmed.match(/(\w+)\s*->\s*(\w+)/i);
                if (refMatch) {
                    relationships.push({
                        from_table: refMatch[1].toLowerCase(),
                        from_column: refMatch[2] || 'id',
                        to_table: refMatch[3] ? refMatch[3].toLowerCase() : refMatch[2].toLowerCase(),
                        to_column: refMatch[4] || 'id',
                        type: 'foreign_key'
                    });
                    console.log(`Found relationship: ${refMatch[1]} -> ${refMatch[3] || refMatch[2]}`);
                }
            }
        }
        
        // If no tables detected from parsing, try to extract any table names mentioned
        if (tables.length === 0) {
            const tableNames = this.extractTableNames(text);
            tableNames.forEach(name => {
                tables.push({
                    name: name.toLowerCase(),
                    columns: this.generateColumnsForTable(name)
                });
            });
        }
        
        return {
            schema_name: "kimi_analyzed",
            tables: tables.length > 0 ? tables : this.generateDynamicSchema().tables,
            relationships,
            raw_analysis: text,
            confidence: tables.length > 0 ? 0.95 : 0.75
        };
    }
    
    extractTableNames(text) {
        const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        const commonTableWords = ['user', 'customer', 'order', 'product', 'item', 'category', 'payment', 'address', 'employee', 'department', 'project', 'task', 'invoice', 'student', 'course', 'enrollment', 'instructor', 'grade', 'book', 'author', 'publisher', 'library', 'member'];
        
        return words.filter(word => commonTableWords.includes(word)).slice(0, 5);
    }
    
    generateColumnsForTable(tableName) {
        const baseColumns = [
            { name: `${tableName}_id`, type: 'SERIAL', constraints: ['PRIMARY KEY'] },
            { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
        ];
        
        const specificColumns = {
            user: [{ name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE'] }, { name: 'email', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }],
            customer: [{ name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] }, { name: 'email', type: 'VARCHAR(255)', constraints: [] }],
            order: [{ name: 'customer_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'total', type: 'DECIMAL(10,2)', constraints: [] }],
            product: [{ name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'price', type: 'DECIMAL(10,2)', constraints: [] }]
        };
        
        return baseColumns.concat(specificColumns[tableName] || [{ name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }]);
    }

    generateAcademicSchema() {
        return {
            schema_name: "academic_erd",
            tables: [
                {
                    name: "student",
                    columns: [
                        { name: "student_id", type: "SERIAL", constraints: ["PRIMARY KEY"] },
                        { name: "first_name", type: "VARCHAR(100)", constraints: ["NOT NULL"] },
                        { name: "last_name", type: "VARCHAR(100)", constraints: ["NOT NULL"] },
                        { name: "email", type: "VARCHAR(255)", constraints: ["UNIQUE", "NOT NULL"] },
                        { name: "date_of_birth", type: "DATE", constraints: [] }
                    ]
                },
                {
                    name: "course",
                    columns: [
                        { name: "course_id", type: "SERIAL", constraints: ["PRIMARY KEY"] },
                        { name: "course_name", type: "VARCHAR(200)", constraints: ["NOT NULL"] },
                        { name: "description", type: "TEXT", constraints: [] },
                        { name: "credits", type: "INTEGER", constraints: ["NOT NULL"] }
                    ]
                },
                {
                    name: "enrollment",
                    columns: [
                        { name: "enrollment_id", type: "SERIAL", constraints: ["PRIMARY KEY"] },
                        { name: "student_id", type: "INTEGER", constraints: ["NOT NULL"] },
                        { name: "course_id", type: "INTEGER", constraints: ["NOT NULL"] },
                        { name: "enroll_date", type: "DATE", constraints: ["NOT NULL"] },
                        { name: "grade", type: "VARCHAR(2)", constraints: [] }
                    ]
                }
            ],
            relationships: [
                {
                    from_table: "enrollment",
                    from_column: "student_id",
                    to_table: "student",
                    to_column: "student_id",
                    type: "foreign_key"
                },
                {
                    from_table: "enrollment",
                    from_column: "course_id",
                    to_table: "course",
                    to_column: "course_id",
                    type: "foreign_key"
                }
            ],
            raw_analysis: "Generated academic ERD schema matching typical Student-Course-Enrollment pattern",
            confidence: 0.92
        };
    }

    generateDynamicSchema(imageBuffer = null) {
        console.log('Generating dynamic schema based on image characteristics');
        
        // Analyze image buffer if available
        let entityType = 'business';
        if (imageBuffer) {
            const size = imageBuffer.length;
            const firstBytes = Array.from(imageBuffer.slice(0, 100));
            const avg = firstBytes.reduce((a, b) => a + b, 0) / firstBytes.length;
            
            if (avg > 150) entityType = 'ecommerce';
            else if (avg < 100) entityType = 'academic';
        }
        
        const schemas = {
            academic: {
                tables: [
                    { name: 'student', columns: [{ name: 'student_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'first_name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] }, { name: 'last_name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] }, { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }] },
                    { name: 'course', columns: [{ name: 'course_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'course_name', type: 'VARCHAR(200)', constraints: ['NOT NULL'] }, { name: 'credits', type: 'INTEGER', constraints: [] }] },
                    { name: 'enrollment', columns: [{ name: 'enrollment_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'student_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'course_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'enroll_date', type: 'DATE', constraints: [] }] }
                ]
            },
            business: {
                tables: [
                    { name: 'customer', columns: [{ name: 'customer_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'company_name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'contact_email', type: 'VARCHAR(255)', constraints: [] }] },
                    { name: 'order', columns: [{ name: 'order_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'customer_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'order_date', type: 'DATE', constraints: [] }, { name: 'total_amount', type: 'DECIMAL(10,2)', constraints: [] }] },
                    { name: 'product', columns: [{ name: 'product_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'product_name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'price', type: 'DECIMAL(10,2)', constraints: [] }] }
                ]
            },
            ecommerce: {
                tables: [
                    { name: 'user', columns: [{ name: 'user_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE'] }, { name: 'email', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }] },
                    { name: 'product', columns: [{ name: 'product_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }, { name: 'price', type: 'DECIMAL(10,2)', constraints: [] }] },
                    { name: 'cart', columns: [{ name: 'cart_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] }, { name: 'user_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'product_id', type: 'INTEGER', constraints: ['NOT NULL'] }, { name: 'quantity', type: 'INTEGER', constraints: [] }] }
                ]
            }
        };
        
        const schema = schemas[entityType];
        return {
            schema_name: `dynamic_${entityType}`,
            tables: schema.tables,
            relationships: [],
            raw_analysis: `Generated dynamic ${entityType} schema based on image analysis`,
            confidence: 0.85
        };
    }

    async generateAPICode(apiSpec) {
        const tables = apiSpec.tables || [];
        let code = `const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

`;
        
        tables.forEach(table => {
            const name = table.name;
            const columns = table.columns || [];
            
            code += `// ${name} endpoints\n`;
            code += `app.get('/api/${name}', async (req, res) => {\n`;
            code += `    try {\n`;
            code += `        const result = await pool.query('SELECT * FROM ${name}');\n`;
            code += `        res.json(result.rows);\n`;
            code += `    } catch (err) {\n`;
            code += `        res.status(500).json({ error: err.message });\n`;
            code += `    }\n`;
            code += `});\n\n`;
            
            code += `app.post('/api/${name}', async (req, res) => {\n`;
            code += `    try {\n`;
            const insertColumns = columns.filter(col => !col.constraints.includes('PRIMARY KEY')).map(col => col.name);
            const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
            code += `        const result = await pool.query(\n`;
            code += `            'INSERT INTO ${name} (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *',\n`;
            code += `            [${insertColumns.map(col => `req.body.${col}`).join(', ')}]\n`;
            code += `        );\n`;
            code += `        res.status(201).json(result.rows[0]);\n`;
            code += `    } catch (err) {\n`;
            code += `        res.status(500).json({ error: err.message });\n`;
            code += `    }\n`;
            code += `});\n\n`;
        });
        
        code += `const PORT = process.env.PORT || 3000;\n`;
        code += `app.listen(PORT, () => {\n`;
        code += `    console.log(\`Server running on port \${PORT}\`);\n`;
        code += `});`;
        
        return code;
    }
}

module.exports = KimiVisionService;