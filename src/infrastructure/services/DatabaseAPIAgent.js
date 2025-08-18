class DatabaseAPIAgent {
    constructor(llmService, databaseService) {
        this.llm = llmService;
        this.db = databaseService;
    }

    async processNaturalLanguageQuery(query, schema) {
        const prompt = `Convert this natural language query to SQL: "${query}"
Schema: ${schema}
Return only the SQL query:`;
        
        const response = await this.llm.generateText(prompt);
        const sql = response.replace(/```sql|```/g, '').trim();
        
        try {
            const result = await this.db.executeQuery(sql);
            return { sql, result, success: true };
        } catch (error) {
            return { sql, error: error.message, success: false };
        }
    }

    async generateAPIFromSchema(schema) {
        const prompt = `Generate REST API endpoints for this schema:
${schema}

Return JSON with endpoints array containing: method, path, description, handler`;
        
        const response = await this.llm.generateText(prompt);
        const endpoints = JSON.parse(response);
        
        return this.createExpressRoutes(endpoints);
    }

    createExpressRoutes(endpoints) {
        let code = `const express = require('express');
const router = express.Router();

`;
        endpoints.forEach(ep => {
            code += `router.${ep.method.toLowerCase()}('${ep.path}', async (req, res) => {
    // ${ep.description}
    ${ep.handler}
});

`;
        });
        
        return code + 'module.exports = router;';
    }

    async executeToolCall(toolName, params) {
        switch(toolName) {
            case 'query_database':
                return await this.processNaturalLanguageQuery(params.query, params.schema);
            case 'generate_api':
                return await this.generateAPIFromSchema(params.schema);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
}

module.exports = DatabaseAPIAgent;