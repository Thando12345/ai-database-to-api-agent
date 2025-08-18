const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class StreamingLLMService {
  constructor(openaiKey, anthropicKey) {
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
  }

  async *streamERDAnalysis(imageBuffer, onProgress) {
    const base64Image = imageBuffer.toString('base64');
    
    yield { type: 'status', message: 'Analyzing ERD image with GPT-4 Vision...' };
    
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Analyze this ERD image and extract database schema. Return JSON format:
{
  "schema_name": "name",
  "tables": [{"name": "table", "columns": [{"name": "col", "type": "type"}]}],
  "relationships": [{"from": "table1", "to": "table2", "type": "one_to_many"}]
}` 
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      stream: true,
      max_tokens: 2000
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      yield { 
        type: 'content', 
        delta, 
        content,
        progress: Math.min((content.length / 1000) * 100, 90)
      };
    }

    yield { type: 'complete', content, schema: this.parseSchema(content) };
  }

  async *streamVoiceToERD(transcript, onProgress) {
    yield { type: 'status', message: 'Converting voice description to database schema...' };
    
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Convert natural language to database schema JSON format."
      }, {
        role: "user",
        content: `Convert this description to database schema: "${transcript}"`
      }],
      stream: true,
      max_tokens: 1500
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      yield { 
        type: 'content', 
        delta, 
        content,
        progress: Math.min((content.length / 800) * 100, 90)
      };
    }

    yield { type: 'complete', content, schema: this.parseSchema(content) };
  }

  async *streamMockDataGeneration(schema, recordCount = 50) {
    yield { type: 'status', message: 'Generating realistic mock data...' };
    
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Generate realistic mock data as SQL INSERT statements."
      }, {
        role: "user",
        content: `Generate ${recordCount} realistic records for: ${JSON.stringify(schema)}`
      }],
      stream: true,
      max_tokens: 3000
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      yield { 
        type: 'content', 
        delta, 
        content,
        progress: Math.min((content.length / 2000) * 100, 90)
      };
    }

    yield { type: 'complete', content, sql: this.extractSQL(content) };
  }

  async *streamNaturalLanguageSQL(query, tableSchemas) {
    yield { type: 'status', message: 'Converting natural language to SQL...' };
    
    if (this.anthropic) {
      // Use Claude for SQL generation (better at structured queries)
      const stream = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        stream: true,
        messages: [{
          role: "user",
          content: `Convert to PostgreSQL: "${query}"\nTables: ${JSON.stringify(tableSchemas)}\nReturn JSON: {"sql": "SELECT...", "explanation": "..."}`
        }]
      });

      let content = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta.text || '';
          content += delta;
          
          yield { 
            type: 'content', 
            delta, 
            content,
            progress: Math.min((content.length / 500) * 100, 90)
          };
        }
      }

      yield { type: 'complete', content, result: this.parseSQL(content) };
    } else {
      // Fallback to OpenAI GPT-4
      const stream = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "Convert natural language to PostgreSQL. Return JSON format."
        }, {
          role: "user",
          content: `Convert to SQL: "${query}"\nTables: ${JSON.stringify(tableSchemas)}`
        }],
        stream: true,
        max_tokens: 1000
      });

      let content = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        content += delta;
        
        yield { 
          type: 'content', 
          delta, 
          content,
          progress: Math.min((content.length / 500) * 100, 90)
        };
      }

      yield { type: 'complete', content, result: this.parseSQL(content) };
    }
  }

  async *streamAPIGeneration(schema, securityConfig) {
    yield { type: 'status', message: 'Generating complete API code...' };
    
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Generate complete Express.js API with Supabase integration."
      }, {
        role: "user",
        content: `Generate API for schema: ${JSON.stringify(schema)}\nSecurity: ${JSON.stringify(securityConfig)}`
      }],
      stream: true,
      max_tokens: 4000
    });

    let content = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      yield { 
        type: 'content', 
        delta, 
        content,
        progress: Math.min((content.length / 3000) * 100, 90)
      };
    }

    yield { type: 'complete', content, code: this.extractCode(content) };
  }

  parseSchema(content) {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : null;
    } catch {
      return null;
    }
  }

  parseSQL(content) {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : { sql: content, explanation: 'Generated query' };
    } catch {
      return { sql: content, explanation: 'Generated query' };
    }
  }

  extractSQL(content) {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    return sqlMatch ? sqlMatch[1] : content;
  }

  extractCode(content) {
    const codeMatch = content.match(/```(?:javascript|js)\n([\s\S]*?)\n```/);
    return codeMatch ? codeMatch[1] : content;
  }
}

module.exports = StreamingLLMService;