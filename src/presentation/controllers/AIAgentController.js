const DatabaseAPIAgent = require('../../infrastructure/services/DatabaseAPIAgent');

class AIAgentController {
    constructor(llmService, databaseService) {
        this.agent = new DatabaseAPIAgent(llmService, databaseService);
    }

    naturalLanguageQuery() {
        return async (req, res) => {
            try {
                const { query, schema } = req.body;
                const result = await this.agent.processNaturalLanguageQuery(query, schema);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        };
    }

    generateAPI() {
        return async (req, res) => {
            try {
                const { schema } = req.body;
                const apiCode = await this.agent.generateAPIFromSchema(schema);
                res.json({ apiCode, success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        };
    }

    executeTool() {
        return async (req, res) => {
            try {
                const { tool, params } = req.body;
                const result = await this.agent.executeToolCall(tool, params);
                res.json({ result, success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        };
    }
}

module.exports = AIAgentController;