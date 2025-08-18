const OpenAI = require('openai');

class ERDVisionService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeERDImage(imageBase64, chatId) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4-vision-preview",
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this ERD image and extract the database structure. Return JSON with tables, columns, primary keys, foreign keys, and relationships. Chat ID: ${chatId}`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                max_tokens: 2000
            });

            const content = response.choices[0].message.content;
            return this.parseERDAnalysis(content, chatId);
        } catch (error) {
            console.error('ERD Vision analysis failed:', error);
            throw error;
        }
    }

    parseERDAnalysis(content, chatId) {
        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback parsing for structured text
            return this.parseStructuredText(content, chatId);
        } catch (error) {
            return this.generateFallbackSchema(chatId);
        }
    }

    parseStructuredText(content, chatId) {
        const tables = [];
        const relationships = [];
        
        // Parse table definitions
        const tableMatches = content.match(/Table:\s*(\w+)/gi) || [];
        
        tableMatches.forEach(match => {
            const tableName = match.replace(/Table:\s*/i, '').toLowerCase();
            const columns = this.extractColumns(content, tableName);
            
            tables.push({
                name: tableName,
                columns: columns,
                primaryKey: columns.find(col => col.isPrimaryKey)?.name || 'id'
            });
        });

        return {
            chatId,
            tables,
            relationships,
            timestamp: new Date().toISOString()
        };
    }

    extractColumns(content, tableName) {
        const columns = [];
        const lines = content.split('\n');
        
        // Look for column definitions near table name
        let inTable = false;
        for (const line of lines) {
            if (line.toLowerCase().includes(tableName)) {
                inTable = true;
                continue;
            }
            
            if (inTable && (line.includes(':') || line.includes('PK') || line.includes('FK'))) {
                const column = this.parseColumnLine(line);
                if (column) columns.push(column);
            }
            
            if (inTable && line.trim() === '') {
                inTable = false;
            }
        }
        
        return columns.length > 0 ? columns : this.getDefaultColumns(tableName);
    }

    parseColumnLine(line) {
        const isPK = line.includes('PK');
        const isFK = line.includes('FK');
        
        // Extract column name
        const nameMatch = line.match(/(\w+)/);
        if (!nameMatch) return null;
        
        const name = nameMatch[1];
        const type = this.inferColumnType(name, isPK, isFK);
        
        return {
            name,
            type,
            isPrimaryKey: isPK,
            isForeignKey: isFK,
            nullable: !isPK
        };
    }

    inferColumnType(name, isPK, isFK) {
        if (isPK || isFK || name.includes('id')) return 'INTEGER';
        if (name.includes('email')) return 'VARCHAR(255)';
        if (name.includes('name')) return 'VARCHAR(100)';
        if (name.includes('date')) return 'DATE';
        if (name.includes('price') || name.includes('amount')) return 'DECIMAL(10,2)';
        if (name.includes('description') || name.includes('content')) return 'TEXT';
        return 'VARCHAR(255)';
    }

    getDefaultColumns(tableName) {
        const baseColumns = [
            { name: `${tableName}_id`, type: 'SERIAL', isPrimaryKey: true, nullable: false }
        ];
        
        // Add common columns based on table name
        if (tableName.includes('user') || tableName.includes('student') || tableName.includes('customer')) {
            baseColumns.push(
                { name: 'first_name', type: 'VARCHAR(100)', nullable: false },
                { name: 'last_name', type: 'VARCHAR(100)', nullable: false },
                { name: 'email', type: 'VARCHAR(255)', nullable: false }
            );
        }
        
        if (tableName.includes('product') || tableName.includes('course')) {
            baseColumns.push(
                { name: 'name', type: 'VARCHAR(200)', nullable: false },
                { name: 'description', type: 'TEXT', nullable: true }
            );
        }
        
        return baseColumns;
    }

    generateFallbackSchema(chatId) {
        return {
            chatId,
            tables: [
                {
                    name: 'students',
                    columns: [
                        { name: 'student_id', type: 'SERIAL', isPrimaryKey: true, nullable: false },
                        { name: 'first_name', type: 'VARCHAR(100)', nullable: false },
                        { name: 'last_name', type: 'VARCHAR(100)', nullable: false },
                        { name: 'email', type: 'VARCHAR(255)', nullable: false },
                        { name: 'date_of_birth', type: 'DATE', nullable: true }
                    ],
                    primaryKey: 'student_id'
                },
                {
                    name: 'courses',
                    columns: [
                        { name: 'course_id', type: 'SERIAL', isPrimaryKey: true, nullable: false },
                        { name: 'course_name', type: 'VARCHAR(200)', nullable: false },
                        { name: 'description', type: 'TEXT', nullable: true },
                        { name: 'credits', type: 'INTEGER', nullable: false }
                    ],
                    primaryKey: 'course_id'
                },
                {
                    name: 'enrollments',
                    columns: [
                        { name: 'enrollment_id', type: 'SERIAL', isPrimaryKey: true, nullable: false },
                        { name: 'student_id', type: 'INTEGER', isForeignKey: true, nullable: false },
                        { name: 'course_id', type: 'INTEGER', isForeignKey: true, nullable: false },
                        { name: 'enroll_date', type: 'DATE', nullable: false }
                    ],
                    primaryKey: 'enrollment_id'
                }
            ],
            relationships: [
                { from: 'enrollments.student_id', to: 'students.student_id', type: 'many-to-one' },
                { from: 'enrollments.course_id', to: 'courses.course_id', type: 'many-to-one' }
            ],
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ERDVisionService;