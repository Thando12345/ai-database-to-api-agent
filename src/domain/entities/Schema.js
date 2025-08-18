class Schema {
  constructor(name, tables = [], relationships = []) {
    this.name = name;
    this.tables = tables;
    this.relationships = relationships;
    this.createdAt = new Date();
  }

  addTable(table) {
    this.tables.push(table);
  }

  addRelationship(relationship) {
    this.relationships.push(relationship);
  }

  toSQL() {
    return this.tables.map(table => table.toSQL()).join('\n\n');
  }
}

class Table {
  constructor(name, columns = []) {
    this.name = name;
    this.columns = columns;
  }

  addColumn(column) {
    this.columns.push(column);
  }

  toSQL() {
    const columnDefs = this.columns.map(col => 
      `  ${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`
    ).join(',\n');
    
    return `CREATE TABLE ${this.name} (\n${columnDefs}\n);`;
  }
}

class Column {
  constructor(name, type, constraints = null) {
    this.name = name;
    this.type = type;
    this.constraints = constraints;
  }
}

module.exports = { Schema, Table, Column };