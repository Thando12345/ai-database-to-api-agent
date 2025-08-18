const { Schema, Table, Column } = require('../../domain/entities/Schema');

class ImageToSchemaUseCase {
  constructor(llmService, schemaRepository) {
    this.llmService = llmService;
    this.schemaRepository = schemaRepository;
  }

  async execute(imageBuffer) {
    const erdData = await this.llmService.analyzeERD(imageBuffer);
    const schema = this.convertToSchema(erdData);
    return await this.schemaRepository.save(schema);
  }

  convertToSchema(erdData) {
    const schema = new Schema(erdData.schema_name || 'generated_schema');
    
    erdData.tables?.forEach(tableData => {
      const table = new Table(tableData.name);
      
      tableData.columns?.forEach(colData => {
        const column = new Column(
          colData.name, 
          colData.type, 
          colData.constraints?.join(' ')
        );
        table.addColumn(column);
      });
      
      schema.addTable(table);
    });
    
    // Add relationships
    erdData.relationships?.forEach(rel => {
      schema.addRelationship(rel);
    });
    
    return schema;
  }
}

module.exports = ImageToSchemaUseCase;