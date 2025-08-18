class OllamaVisionService {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async analyzeERD(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        prompt: 'Analyze this ERD image and extract database schema. Return JSON: {"tables":[{"name":"table_name","columns":[{"name":"column_name","type":"data_type","constraints":["PRIMARY KEY"]}]}],"relationships":[{"from_table":"table1","to_table":"table2","type":"one_to_many"}]}',
        images: [base64Image],
        stream: false
      })
    });

    const result = await response.json();
    const content = result.response;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('Failed to parse ERD analysis response');
    }
  }

  async generateAPICode(apiSpec) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'codellama',
        prompt: `Generate Express.js API for: ${JSON.stringify(apiSpec, null, 2)}`,
        stream: false
      })
    });

    const result = await response.json();
    return result.response;
  }
}

module.exports = OllamaVisionService;