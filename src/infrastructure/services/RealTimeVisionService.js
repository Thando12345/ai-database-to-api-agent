// Real-Time Vision Service with Multiple AI Providers
const OpenAI = require('openai');
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');
const vision = require('@google-cloud/vision');
const Anthropic = require('@anthropic-ai/sdk');

class RealTimeVisionService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        
        // Azure Vision
        const cognitiveServiceCredentials = new CognitiveServicesCredentials(process.env.AZURE_VISION_KEY);
        this.azureVision = new ComputerVisionClient(cognitiveServiceCredentials, process.env.AZURE_VISION_ENDPOINT);
        
        // Google Vision
        this.googleVision = new vision.ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    }

    async analyzeERDImage(imageBuffer, provider = 'openai') {
        const base64Image = imageBuffer.toString('base64');
        
        switch (provider) {
            case 'openai':
                return await this.analyzeWithOpenAI(base64Image);
            case 'anthropic':
                return await this.analyzeWithAnthropic(base64Image);
            case 'azure':
                return await this.analyzeWithAzure(imageBuffer);
            case 'google':
                return await this.analyzeWithGoogle(imageBuffer);
            default:
                return await this.analyzeWithOpenAI(base64Image);
        }
    }

    async analyzeWithOpenAI(base64Image) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [{
                    type: "text",
                    text: "Analyze this ERD diagram. Extract ALL tables, columns with data types, primary keys, foreign keys, and relationships. Return ONLY valid JSON: {\"tables\":[{\"name\":\"table_name\",\"columns\":[{\"name\":\"column_name\",\"type\":\"data_type\",\"constraints\":[\"PRIMARY KEY\"]}]}],\"relationships\":[{\"from_table\":\"table1\",\"to_table\":\"table2\",\"type\":\"one_to_many\"}]}"
                }, {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                }]
            }],
            max_tokens: 4000
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async analyzeWithAnthropic(base64Image) {
        const response = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            messages: [{
                role: "user",
                content: [{
                    type: "text",
                    text: "Analyze this ERD diagram precisely. Extract tables, columns, data types, constraints, and relationships. Return JSON format only: {\"tables\":[{\"name\":\"table_name\",\"columns\":[{\"name\":\"column_name\",\"type\":\"data_type\",\"constraints\":[\"PRIMARY KEY\"]}]}],\"relationships\":[]}"
                }, {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: base64Image
                    }
                }]
            }]
        });

        return JSON.parse(response.content[0].text);
    }

    async analyzeWithAzure(imageBuffer) {
        const result = await this.azureVision.analyzeImageInStream(imageBuffer, {
            visualFeatures: ['Objects', 'Tags', 'Description'],
            details: ['Landmarks']
        });

        // Convert Azure result to ERD format
        return this.convertAzureToERD(result);
    }

    async analyzeWithGoogle(imageBuffer) {
        const [result] = await this.googleVision.textDetection({ image: { content: imageBuffer } });
        const detections = result.textAnnotations;
        
        // Convert Google result to ERD format
        return this.convertGoogleToERD(detections);
    }

    convertAzureToERD(azureResult) {
        const tables = [];
        const objects = azureResult.objects || [];
        
        // Extract table-like objects
        objects.forEach((obj, index) => {
            if (obj.object.toLowerCase().includes('table') || obj.confidence > 0.7) {
                tables.push({
                    name: `table_${index + 1}`,
                    columns: [
                        { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }
                    ]
                });
            }
        });

        return { tables, relationships: [] };
    }

    convertGoogleToERD(textDetections) {
        const tables = [];
        const text = textDetections[0]?.description || '';
        
        // Simple text parsing for table names
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (line.length > 3 && line.length < 20) {
                tables.push({
                    name: line.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    columns: [
                        { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                        { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }
                    ]
                });
            }
        });

        return { tables: tables.slice(0, 5), relationships: [] };
    }
}

module.exports = RealTimeVisionService;