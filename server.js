const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('src/presentation/web'));

// File upload configuration
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/presentation/web/index.html'));
});

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Simulate image analysis
        const analysis = {
            tables: [
                {
                    name: 'users',
                    columns: [
                        { name: 'user_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE', 'NOT NULL'] },
                        { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE', 'NOT NULL'] }
                    ]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'post_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(user_id)'] },
                        { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
                        { name: 'content', type: 'TEXT', constraints: [] }
                    ]
                }
            ],
            relationships: [
                {
                    from_table: 'users',
                    to_table: 'posts',
                    type: 'one_to_many'
                }
            ]
        };

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.post('/api/analyze-text', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        // Simple text analysis
        const words = text.toLowerCase();
        const tables = [];

        if (words.includes('user') || words.includes('customer')) {
            tables.push({
                name: 'users',
                columns: [
                    { name: 'user_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
                    { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }
                ]
            });
        }

        if (words.includes('product') || words.includes('item')) {
            tables.push({
                name: 'products',
                columns: [
                    { name: 'product_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(200)', constraints: ['NOT NULL'] },
                    { name: 'price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] }
                ]
            });
        }

        if (words.includes('order') || words.includes('purchase')) {
            tables.push({
                name: 'orders',
                columns: [
                    { name: 'order_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(user_id)'] },
                    { name: 'total', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] }
                ]
            });
        }

        if (tables.length === 0) {
            tables.push({
                name: 'entities',
                columns: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }
                ]
            });
        }

        const analysis = { tables, relationships: [] };
        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Text analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.post('/api/generate-schema', (req, res) => {
    try {
        const { analysis } = req.body;
        
        let sql = '-- Generated SQL Schema\n\n';
        
        analysis.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            table.columns.forEach((col, index) => {
                const comma = index < table.columns.length - 1 ? ',' : '';
                const constraints = col.constraints ? ' ' + col.constraints.join(' ') : '';
                sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
            });
            sql += ');\n\n';
        });

        res.json({ success: true, schema: sql });
    } catch (error) {
        console.error('Schema generation error:', error);
        res.status(500).json({ error: 'Schema generation failed' });
    }
});

app.post('/api/generate-api', (req, res) => {
    try {
        const { analysis } = req.body;
        
        let code = `const express = require('express');
const app = express();
app.use(express.json());

`;
        
        analysis.tables.forEach(table => {
            const name = table.name;
            code += `// ${name} endpoints
app.get('/api/${name}', (req, res) => {
    res.json({ message: 'Get all ${name}' });
});

app.post('/api/${name}', (req, res) => {
    res.json({ message: 'Create ${name.slice(0, -1)}', data: req.body });
});

`;
        });

        code += `app.listen(3000, () => {
    console.log('API running on port 3000');
});`;

        res.json({ success: true, apiCode: code });
    } catch (error) {
        console.error('API generation error:', error);
        res.status(500).json({ error: 'API generation failed' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Database-to-API Agent running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to get started`);
});

module.exports = app;