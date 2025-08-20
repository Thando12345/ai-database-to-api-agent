// Real-time client for database operations
console.log('Real-time client loaded');

class RealTimeClient {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('connect', () => {
                this.connected = true;
                console.log('🔌 Connected to real-time server');
            });
        }
    }

    exportSchema(format, data) {
        if (format === 'markdown') {
            return this.generateMarkdown(data);
        } else if (format === 'api') {
            return this.generateAPI(data);
        }
    }

    generateMarkdown(data) {
        let md = '# Database Schema\n\n';
        if (data.tables) {
            data.tables.forEach(table => {
                md += `## ${table.name}\n\n`;
                md += '| Column | Type | Constraints |\n';
                md += '|--------|------|-------------|\n';
                table.columns.forEach(col => {
                    md += `| ${col.name} | ${col.type} | ${col.constraints?.join(', ') || ''} |\n`;
                });
                md += '\n';
            });
        }
        return md;
    }

    generateAPI(data) {
        let api = 'const express = require("express");\nconst app = express();\n\n';
        if (data.tables) {
            data.tables.forEach(table => {
                api += `// ${table.name} endpoints\n`;
                api += `app.get('/api/${table.name}', (req, res) => res.json([]));\n`;
                api += `app.post('/api/${table.name}', (req, res) => res.json(req.body));\n\n`;
            });
        }
        api += 'app.listen(3000);';
        return api;
    }
}

window.realTimeClient = new RealTimeClient();