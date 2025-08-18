const OpenAI = require('openai');
const fs = require('fs').promises;

class EnhancedOpenAIService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.prompts = this.loadPrompts();
  }

  loadPrompts() {
    return {
      erdAnalysis: `You are an expert database architect. Analyze this ERD image and extract:

1. **Tables**: Identify all table names
2. **Columns**: For each table, list column names and data types
3. **Relationships**: Identify foreign keys and relationship types
4. **Constraints**: Primary keys, unique constraints, not null constraints

Return response in this exact JSON format:
{
  "schema_name": "extracted_schema",
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "constraints": ["PRIMARY KEY", "NOT NULL"],
          "references": {
            "table": "referenced_table",
            "column": "referenced_column"
          }
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
}`,

      voiceToERD: `You are a database design expert. Convert this natural language description into a structured database schema.

User Description: "{description}"

Return response in this exact JSON format:
{
  "schema_name": "generated_from_voice",
  "description": "Brief summary",
  "tables": [
    {
      "name": "entity_name",
      "purpose": "What this table represents",
      "columns": [
        {
          "name": "column_name",
          "type": "PostgreSQL_data_type",
          "constraints": ["PRIMARY KEY", "NOT NULL"],
          "description": "What this column stores"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from_table": "parent_table",
      "to_table": "child_table", 
      "type": "one_to_many",
      "description": "Relationship explanation"
    }
  ]
}

Use PostgreSQL data types. Always include id (UUID PRIMARY KEY) and timestamps.`,

      mockDataGeneration: `Generate realistic mock data for this database schema:

Schema: {schema}
Records needed: {count} per table

Return SQL INSERT statements with realistic, diverse data that maintains referential integrity.`,

      naturalLanguageSQL: `Convert this natural language query to PostgreSQL:

Query: "{query}"
Tables: {tables}

Rules:
1. Only SELECT statements
2. Use exact table/column names
3. Optimize with proper JOINs

Return JSON:
{
  "sql": "SELECT statement",
  "explanation": "What the query does",
  "tables_used": ["table1"],
  "complexity": "low|medium|high"
}`
    };
  }

  async analyzeERD(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: this.prompts.erdAnalysis },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      // Fallback parsing if JSON is wrapped in markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse ERD analysis response');
    }
  }

  async generateERDFromVoice(description) {
    const prompt = this.prompts.voiceToERD.replace('{description}', description);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a database design expert." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.2
    });

    const content = response.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse voice-to-ERD response');
    }
  }

  async generateMockData(schema, recordCount = 50) {
    const prompt = this.prompts.mockDataGeneration
      .replace('{schema}', JSON.stringify(schema, null, 2))
      .replace('{count}', recordCount.toString());
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a database expert who generates realistic mock data." },
        { role: "user", content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  }

  async convertToSQL(naturalLanguageQuery, tableSchemas) {
    const prompt = this.prompts.naturalLanguageSQL
      .replace('{query}', naturalLanguageQuery)
      .replace('{tables}', JSON.stringify(tableSchemas, null, 2));
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a PostgreSQL expert." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse SQL conversion response');
    }
  }

  async generateAPICode(apiSpec) {
    const prompt = `Generate a complete Express.js API implementation for this OpenAPI specification:

${JSON.stringify(apiSpec, null, 2)}

Include:
1. Express routes with proper middleware
2. Input validation using Joi
3. Error handling
4. Supabase integration
5. JWT authentication
6. Rate limiting
7. CORS configuration

Return complete, production-ready Node.js code.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a senior Node.js developer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.2
    });

    return response.choices[0].message.content;
  }
}

module.exports = EnhancedOpenAIService;