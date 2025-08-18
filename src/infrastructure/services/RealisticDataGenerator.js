class RealisticDataGenerator {
    constructor() {
        this.studentNames = [
            { first: 'John', last: 'Smith', email: 'john.smith@university.edu' },
            { first: 'Sarah', last: 'Johnson', email: 'sarah.johnson@university.edu' },
            { first: 'Michael', last: 'Brown', email: 'michael.brown@university.edu' },
            { first: 'Emily', last: 'Davis', email: 'emily.davis@university.edu' },
            { first: 'David', last: 'Wilson', email: 'david.wilson@university.edu' },
            { first: 'Jessica', last: 'Miller', email: 'jessica.miller@university.edu' },
            { first: 'Christopher', last: 'Moore', email: 'christopher.moore@university.edu' },
            { first: 'Ashley', last: 'Taylor', email: 'ashley.taylor@university.edu' }
        ];

        this.courses = [
            { name: 'Computer Science Fundamentals', description: 'Introduction to programming concepts and algorithms', credits: 3 },
            { name: 'Database Systems', description: 'Relational database design and SQL programming', credits: 4 },
            { name: 'Web Development', description: 'Full-stack web application development', credits: 3 },
            { name: 'Data Structures', description: 'Advanced data structures and their applications', credits: 4 },
            { name: 'Software Engineering', description: 'Software development lifecycle and methodologies', credits: 3 },
            { name: 'Machine Learning', description: 'Introduction to ML algorithms and applications', credits: 4 },
            { name: 'Network Security', description: 'Cybersecurity principles and network protection', credits: 3 },
            { name: 'Mobile App Development', description: 'iOS and Android application development', credits: 3 }
        ];

        this.products = [
            { name: 'Wireless Bluetooth Headphones', description: 'High-quality noise-canceling headphones', price: 199.99, category: 'Electronics' },
            { name: 'Ergonomic Office Chair', description: 'Comfortable chair with lumbar support', price: 299.99, category: 'Furniture' },
            { name: 'Stainless Steel Water Bottle', description: 'Insulated bottle keeps drinks cold/hot', price: 24.99, category: 'Accessories' },
            { name: 'Mechanical Gaming Keyboard', description: 'RGB backlit keyboard with tactile switches', price: 149.99, category: 'Electronics' },
            { name: 'Organic Cotton T-Shirt', description: 'Soft, breathable cotton shirt', price: 29.99, category: 'Clothing' }
        ];
    }

    generateRealisticData(schema, chatId) {
        const data = {};
        const generatedIds = {};

        // Generate data for each table
        schema.tables.forEach(table => {
            data[table.name] = this.generateTableData(table, schema, generatedIds, chatId);
        });

        return {
            chatId,
            data,
            metadata: {
                generatedAt: new Date().toISOString(),
                totalRecords: Object.values(data).reduce((sum, records) => sum + records.length, 0),
                tables: schema.tables.map(t => t.name)
            }
        };
    }

    generateTableData(table, schema, generatedIds, chatId) {
        const recordCount = this.getRecordCount(table.name);
        const records = [];
        
        for (let i = 1; i <= recordCount; i++) {
            const record = {};
            
            table.columns.forEach(column => {
                record[column.name] = this.generateColumnValue(column, table, i, generatedIds, chatId);
            });
            
            records.push(record);
        }
        
        // Store generated IDs for foreign key references
        if (table.primaryKey) {
            generatedIds[table.name] = records.map(r => r[table.primaryKey]);
        }
        
        return records;
    }

    generateColumnValue(column, table, recordIndex, generatedIds, chatId) {
        // Primary key
        if (column.isPrimaryKey) {
            return recordIndex;
        }
        
        // Foreign key
        if (column.isForeignKey) {
            const referencedTable = this.findReferencedTable(column.name);
            const availableIds = generatedIds[referencedTable];
            if (availableIds && availableIds.length > 0) {
                return availableIds[Math.floor(Math.random() * availableIds.length)];
            }
            return 1; // Fallback
        }
        
        // Generate realistic data based on column name and table context
        return this.generateRealisticValue(column, table, recordIndex, chatId);
    }

    generateRealisticValue(column, table, recordIndex, chatId) {
        const columnName = column.name.toLowerCase();
        const tableName = table.name.toLowerCase();
        
        // Names
        if (columnName.includes('first_name') || columnName === 'firstname') {
            return this.studentNames[recordIndex % this.studentNames.length].first;
        }
        
        if (columnName.includes('last_name') || columnName === 'lastname') {
            return this.studentNames[recordIndex % this.studentNames.length].last;
        }
        
        if (columnName.includes('name') && !columnName.includes('first') && !columnName.includes('last')) {
            if (tableName.includes('course')) {
                return this.courses[recordIndex % this.courses.length].name;
            }
            if (tableName.includes('product')) {
                return this.products[recordIndex % this.products.length].name;
            }
            return `${table.name.charAt(0).toUpperCase() + table.name.slice(1)} ${recordIndex}`;
        }
        
        // Email
        if (columnName.includes('email')) {
            if (tableName.includes('student') || tableName.includes('user')) {
                return this.studentNames[recordIndex % this.studentNames.length].email;
            }
            return `user${recordIndex}@example.com`;
        }
        
        // Dates
        if (columnName.includes('date') || column.type === 'DATE') {
            if (columnName.includes('birth')) {
                const year = 1995 + Math.floor(Math.random() * 10);
                const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
                const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            if (columnName.includes('enroll') || columnName.includes('created')) {
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 365));
                return date.toISOString().split('T')[0];
            }
            return new Date().toISOString().split('T')[0];
        }
        
        // Description
        if (columnName.includes('description')) {
            if (tableName.includes('course')) {
                return this.courses[recordIndex % this.courses.length].description;
            }
            if (tableName.includes('product')) {
                return this.products[recordIndex % this.products.length].description;
            }
            return `Detailed description for ${table.name} record ${recordIndex}`;
        }
        
        // Credits
        if (columnName.includes('credit')) {
            return this.courses[recordIndex % this.courses.length].credits;
        }
        
        // Price
        if (columnName.includes('price') || columnName.includes('amount')) {
            if (tableName.includes('product')) {
                return this.products[recordIndex % this.products.length].price;
            }
            return (Math.random() * 1000 + 10).toFixed(2);
        }
        
        // Category
        if (columnName.includes('category')) {
            return this.products[recordIndex % this.products.length].category;
        }
        
        // Status
        if (columnName.includes('status')) {
            const statuses = ['active', 'inactive', 'pending', 'completed'];
            return statuses[recordIndex % statuses.length];
        }
        
        // Phone
        if (columnName.includes('phone')) {
            return `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        }
        
        // Address
        if (columnName.includes('address')) {
            const addresses = [
                '123 Main St, New York, NY 10001',
                '456 Oak Ave, Los Angeles, CA 90210',
                '789 Pine Rd, Chicago, IL 60601',
                '321 Elm St, Houston, TX 77001'
            ];
            return addresses[recordIndex % addresses.length];
        }
        
        // Default values based on type
        if (column.type.includes('INTEGER') || column.type.includes('SERIAL')) {
            return Math.floor(Math.random() * 100) + 1;
        }
        
        if (column.type.includes('DECIMAL')) {
            return (Math.random() * 1000).toFixed(2);
        }
        
        if (column.type.includes('BOOLEAN')) {
            return Math.random() > 0.5;
        }
        
        // Default string value
        return `Sample ${columnName} ${recordIndex}`;
    }

    findReferencedTable(foreignKeyColumn) {
        // Extract table name from foreign key column (e.g., student_id -> students)
        const baseName = foreignKeyColumn.replace('_id', '');
        
        // Handle pluralization
        if (baseName.endsWith('s')) {
            return baseName;
        }
        
        // Common pluralization rules
        if (baseName.endsWith('y')) {
            return baseName.slice(0, -1) + 'ies';
        }
        
        return baseName + 's';
    }

    getRecordCount(tableName) {
        // Generate appropriate number of records per table
        if (tableName.includes('user') || tableName.includes('student') || tableName.includes('customer')) {
            return 8;
        }
        if (tableName.includes('product') || tableName.includes('course')) {
            return 5;
        }
        if (tableName.includes('order') || tableName.includes('enrollment')) {
            return 12; // More relationship records
        }
        return 6; // Default
    }
}

module.exports = RealisticDataGenerator;