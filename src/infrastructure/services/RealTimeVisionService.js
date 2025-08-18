const axios = require('axios');

class RealTimeVisionService {
    constructor() {
        this.providers = [
            { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
            { name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' },
            { name: 'Moonshot', endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-128k' }
        ];
        this.activeProvider = null;
        this.initializeProvider();
    }

    async initializeProvider() {
        // Try providers in order of preference
        for (const provider of this.providers) {
            if (await this.testProvider(provider)) {
                this.activeProvider = provider;
                console.log(`✅ Real-time vision: ${provider.name} active`);
                return;
            }
        }
        console.warn('⚠️ No vision providers available - using fallback');
    }

    async testProvider(provider) {
        try {
            const apiKey = this.getAPIKey(provider.name);
            if (!apiKey) return false;

            // Quick test request
            const headers = this.getHeaders(provider.name, apiKey);
            const response = await axios.post(provider.endpoint, {
                model: provider.model,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 10
            }, { headers, timeout: 5000 });

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    getAPIKey(providerName) {
        const keyMap = {
            'OpenAI': process.env.OPENAI_API_KEY,
            'Anthropic': process.env.ANTHROPIC_API_KEY,
            'Moonshot': process.env.MOONSHOT_API_KEY
        };
        return keyMap[providerName];
    }

    getHeaders(providerName, apiKey) {
        const headerMap = {
            'OpenAI': {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            'Anthropic': {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            'Moonshot': {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        return headerMap[providerName];
    }

    async analyzeERDRealTime(imageBuffer, onProgress) {
        if (!this.activeProvider) {
            throw new Error('No vision provider available');
        }

        try {
            onProgress?.('🔍 Converting image to base64...');
            const base64Image = imageBuffer.toString('base64');

            onProgress?.('🤖 Sending to AI vision model...');
            const analysis = await this.processWithProvider(base64Image);

            onProgress?.('📊 Extracting database structure...');
            const schema = this.parseAnalysisToSchema(analysis);

            onProgress?.('✅ Real-time analysis complete!');
            return schema;

        } catch (error) {
            console.error('Real-time vision error:', error);
            throw new Error(`Vision analysis failed: ${error.message}`);
        }
    }

    async processWithProvider(base64Image) {
        const provider = this.activeProvider;
        const apiKey = this.getAPIKey(provider.name);
        const headers = this.getHeaders(provider.name, apiKey);

        const prompt = `Analyze this ERD diagram and extract ALL tables, columns, data types, constraints, and relationships. 
Return ONLY valid JSON in this exact format:
{
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
      "to_table": "table2",
      "type": "one_to_many",
      "from_column": "id",
      "to_column": "table1_id"
    }
  ]
}`;

        let requestBody;
        if (provider.name === 'Anthropic') {
            requestBody = {
                model: provider.model,
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }]
            };
        } else {
            requestBody = {
                model: provider.model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                        }
                    ]
                }],
                max_tokens: 4000
            };
        }

        const response = await axios.post(provider.endpoint, requestBody, { 
            headers,
            timeout: 30000
        });

        return this.extractContent(response.data, provider.name);
    }

    extractContent(responseData, providerName) {
        if (providerName === 'Anthropic') {
            return responseData.content?.[0]?.text || '';
        } else {
            return responseData.choices?.[0]?.message?.content || '';
        }
    }

    parseAnalysisToSchema(analysisText) {
        try {
            // Clean the response to extract JSON
            let jsonText = analysisText.trim();
            
            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Find JSON object boundaries
            const startIndex = jsonText.indexOf('{');
            const lastIndex = jsonText.lastIndexOf('}');
            
            if (startIndex !== -1 && lastIndex !== -1) {
                jsonText = jsonText.substring(startIndex, lastIndex + 1);
            }

            const parsed = JSON.parse(jsonText);
            
            // Validate structure
            if (!parsed.tables || !Array.isArray(parsed.tables)) {
                throw new Error('Invalid schema structure');
            }

            return {
                tables: parsed.tables,
                relationships: parsed.relationships || [],
                raw_analysis: analysisText,
                provider: this.activeProvider.name,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Schema parsing error:', error);
            // Return fallback schema
            return this.generateFallbackSchema();
        }
    }

    generateFallbackSchema() {
        return {
            tables: [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE', 'NOT NULL'] },
                        { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
                    ]
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(id)'] },
                        { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'] },
                        { name: 'content', type: 'TEXT', constraints: [] }
                    ]
                }
            ],
            relationships: [
                {
                    from_table: 'users',
                    to_table: 'posts',
                    type: 'one_to_many',
                    from_column: 'id',
                    to_column: 'user_id'
                }
            ],
            raw_analysis: 'Fallback schema generated due to parsing error',
            provider: 'Fallback',
            timestamp: new Date().toISOString()
        };
    }

    async processVoiceToSchema(transcript, onProgress) {
        if (!this.activeProvider) {
            throw new Error('No AI provider available');
        }

        try {
            onProgress?.('🎤 Processing voice transcript...');
            
            const prompt = `Convert this voice description into a database schema:
"${transcript}"

Return ONLY valid JSON:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "constraints": ["PRIMARY KEY"]
        }
      ]
    }
  ],
  "relationships": []
}`;

            const provider = this.activeProvider;
            const apiKey = this.getAPIKey(provider.name);
            const headers = this.getHeaders(provider.name, apiKey);

            let requestBody;
            if (provider.name === 'Anthropic') {
                requestBody = {
                    model: provider.model,
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: prompt }]
                };
            } else {
                requestBody = {
                    model: provider.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000
                };
            }

            onProgress?.('🤖 Generating schema with AI...');
            const response = await axios.post(provider.endpoint, requestBody, { 
                headers,
                timeout: 15000
            });

            const content = this.extractContent(response.data, provider.name);
            const schema = this.parseAnalysisToSchema(content);

            onProgress?.('✅ Voice-to-schema complete!');
            return schema;

        } catch (error) {
            console.error('Voice processing error:', error);
            throw new Error(`Voice processing failed: ${error.message}`);
        }
    }

    getProviderStatus() {
        return {
            activeProvider: this.activeProvider?.name || 'None',
            availableProviders: this.providers.map(p => p.name),
            isReady: !!this.activeProvider
        };
    }
}

module.exports = RealTimeVisionService;