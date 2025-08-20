// ERD Generator and Export Functions
console.log('ERD Generator loaded');

class ERDGenerator {
    constructor() {
        this.currentSchema = null;
    }

    setSchema(schema) {
        this.currentSchema = schema;
    }

    exportToMarkdown() {
        if (!this.currentSchema) return '';
        
        let md = '# Database Schema Export\n\n';
        md += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        if (this.currentSchema.tables) {
            this.currentSchema.tables.forEach(table => {
                md += `## Table: ${table.name}\n\n`;
                md += '| Column | Type | Constraints |\n';
                md += '|--------|------|-------------|\n';
                
                table.columns.forEach(col => {
                    const constraints = col.constraints ? col.constraints.join(', ') : '';
                    md += `| ${col.name} | ${col.type} | ${constraints} |\n`;
                });
                md += '\n';
            });
        }
        
        return md;
    }

    exportToAPI() {
        if (!this.currentSchema) return '';
        
        let api = '// Generated Express.js API\n';
        api += 'const express = require("express");\n';
        api += 'const app = express();\n';
        api += 'app.use(express.json());\n\n';
        
        if (this.currentSchema.tables) {
            this.currentSchema.tables.forEach(table => {
                const name = table.name;
                api += `// ${name} endpoints\n`;
                api += `app.get('/api/${name}', (req, res) => {\n`;
                api += `    res.json({ message: 'Get all ${name}' });\n`;
                api += '});\n\n';
                api += `app.post('/api/${name}', (req, res) => {\n`;
                api += `    res.json({ message: 'Create ${name.slice(0, -1)}', data: req.body });\n`;
                api += '});\n\n';
            });
        }
        
        api += 'app.listen(3000, () => console.log("API running on port 3000"));';
        return api;
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportMarkdown() {
        const content = this.exportToMarkdown();
        this.downloadFile(content, 'database-schema.md', 'text/markdown');
    }

    exportAPI() {
        const content = this.exportToAPI();
        this.downloadFile(content, 'generated-api.js', 'text/javascript');
    }
}

window.erdGenerator = new ERDGenerator();