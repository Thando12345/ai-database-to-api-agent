const { Schema, Table, Column } = require('../../domain/entities/Schema');

class VoiceToERDUseCase {
  constructor(speechService, llmService, schemaRepository) {
    this.speechService = speechService;
    this.llmService = llmService;
    this.schemaRepository = schemaRepository;
  }

  async execute(audioBuffer) {
    const transcript = await this.speechService.transcribe(audioBuffer);
    const erdStructure = await this.llmService.generateERDFromVoice(transcript);
    const schema = this.convertToSchema(erdStructure);
    return await this.schemaRepository.save(schema);
  }

  convertToSchema(erdStructure) {
    const schema = new Schema(erdStructure.name || 'voice_generated_schema');
    
    erdStructure.tables?.forEach(tableData => {
      const table = new Table(tableData.name);
      
      tableData.columns?.forEach(colData => {
        const column = new Column(colData.name, colData.type, colData.constraints);
        table.addColumn(column);
      });
      
      schema.addTable(table);
    });
    
    return schema;
  }
}

module.exports = VoiceToERDUseCase;