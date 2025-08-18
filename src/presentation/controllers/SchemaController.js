const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

class SchemaController {
  constructor(imageToSchemaUseCase, voiceToERDUseCase, schemaToAPIUseCase) {
    this.imageToSchemaUseCase = imageToSchemaUseCase;
    this.voiceToERDUseCase = voiceToERDUseCase;
    this.schemaToAPIUseCase = schemaToAPIUseCase;
  }

  uploadImage() {
    return [upload.array('images', 10), async (req, res) => {
      try {
        const options = JSON.parse(req.body.options || '{}');
        const analyses = [];
        
        for (const file of req.files) {
          const analysis = await this.imageToSchemaUseCase.execute(file.buffer);
          analyses.push(analysis);
        }
        
        // Merge multiple analyses
        const mergedAnalysis = this.mergeAnalyses(analyses);
        
        res.json({ 
          success: true, 
          analysis: mergedAnalysis,
          schema: this.generateSQLFromAnalysis(mergedAnalysis, options)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }];
  }

  mergeAnalyses(analyses) {
    const merged = {
      schema_name: 'merged_schema',
      tables: [],
      relationships: []
    };
    
    analyses.forEach(analysis => {
      if (analysis.tables) merged.tables.push(...analysis.tables);
      if (analysis.relationships) merged.relationships.push(...analysis.relationships);
    });
    
    return merged;
  }

  generateSQLFromAnalysis(analysis, options = {}) {
    let sql = '-- Generated from ERD Analysis\n\n';
    
    if (analysis.tables) {
      analysis.tables.forEach(table => {
        sql += `CREATE TABLE ${table.name} (\n`;
        
        table.columns.forEach((col, index) => {
          const comma = index < table.columns.length - 1 ? ',' : '';
          const constraints = col.constraints ? ` ${col.constraints.join(' ')}` : '';
          sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
        });
        
        sql += ');\n\n';
      });
    }
    
    if (options.addConstraints && analysis.relationships) {
      sql += '-- Foreign Key Constraints\n';
      analysis.relationships.forEach(rel => {
        sql += `ALTER TABLE ${rel.from_table} ADD CONSTRAINT fk_${rel.from_column} \n`;
        sql += `    FOREIGN KEY (${rel.from_column}) REFERENCES ${rel.to_table}(${rel.to_column});\n\n`;
      });
    }
    
    return sql;
  }

  uploadVoice() {
    return [upload.single('audio'), async (req, res) => {
      try {
        const schema = await this.voiceToERDUseCase.execute(req.file.buffer);
        res.json({ success: true, schema: schema.toSQL() });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }];
  }

  generateAPI() {
    return async (req, res) => {
      try {
        const { schema, options } = req.body;
        const apiCode = await this.schemaToAPIUseCase.execute(schema, options);
        res.json({ success: true, apiCode });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    };
  }
}

module.exports = SchemaController;