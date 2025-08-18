class LocalVisionService {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.model = 'zai-org/GLM-4.5V';
  }

  async analyzeERD(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this ERD image and extract database schema information. Return JSON format:
{
  "schema_name": "extracted_schema",
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "constraints": ["PRIMARY KEY", "NOT NULL"]
        }
      ]
    }
  ],
  "relationships": [
    {
      "from_table": "table1",
      "from_column": "column1",
      "to_table": "table2", 
      "to_column": "column2",
      "type": "one_to_many"
    }
  ]
}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ]
        }]
      })
    });

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw new Error('Failed to parse ERD analysis response');
    }
  }

  async generateAPICode(apiSpec) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'user',
          content: `Generate Express.js API code for this schema: ${JSON.stringify(apiSpec, null, 2)}
          
Include: routes, validation, error handling, CORS, authentication middleware.
Return complete Node.js code.`
        }]
      })
    });

    const result = await response.json();
    return result.choices[0].message.content;
  }
}

module.exports = LocalVisionService;