const OpenAI = require('openai');

class OpenAIVisionService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeERD(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Analyze this ERD image and extract table structures with columns and relationships." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }

  async generateERD(description) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Convert natural language descriptions into structured database schema JSON."
      }, {
        role: "user",
        content: description
      }],
      max_tokens: 800
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

module.exports = OpenAIVisionService;