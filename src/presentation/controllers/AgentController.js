class AgentController {
  constructor(autonomousAgentUseCase, databaseManagementUseCase, videoCallService, speechService) {
    this.autonomousAgentUseCase = autonomousAgentUseCase;
    this.databaseManagementUseCase = databaseManagementUseCase;
    this.videoCallService = videoCallService;
    this.speechService = speechService;
  }

  async executeWorkflow() {
    return async (req, res) => {
      try {
        const { input, workflowType } = req.body;
        const result = await this.autonomousAgentUseCase.executeFullWorkflow(input, workflowType);
        
        // Provide spoken feedback
        const feedback = `Workflow completed. ${result.success ? 'API deployed successfully' : 'Workflow failed'}`;
        const audioFeedback = await this.speechService.synthesize(feedback);
        
        res.json({ ...result, audioFeedback: audioFeedback.toString('base64') });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }

  async naturalLanguageQuery() {
    return async (req, res) => {
      try {
        const { query, userId } = req.body;
        const result = await this.databaseManagementUseCase.executeNaturalLanguageQuery(query, userId);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }

  async requestCall() {
    return async (req, res) => {
      try {
        const { phoneNumber, context } = req.body;
        const call = await this.videoCallService.initiateCall(phoneNumber, context);
        res.json(call);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }

  async generateMockData() {
    return async (req, res) => {
      try {
        const { schema, recordCount } = req.body;
        const mockData = await this.databaseManagementUseCase.generateMockData(schema, recordCount);
        res.json({ success: true, mockData });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }
}

module.exports = AgentController;