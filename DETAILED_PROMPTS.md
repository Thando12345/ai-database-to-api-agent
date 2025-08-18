# Detailed AI Prompts for Database-to-API Agent

## 1. ERD Image Analysis Prompt

```
You are an expert database architect. Analyze this ERD image and extract:

1. **Tables**: Identify all table names
2. **Columns**: For each table, list column names and data types
3. **Relationships**: Identify foreign keys and relationship types (1:1, 1:many, many:many)
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
          "constraints": ["PRIMARY KEY", "NOT NULL", "UNIQUE"],
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
}

Focus on accuracy and completeness. If uncertain about data types, use sensible defaults (VARCHAR(255) for text, INTEGER for numbers, TIMESTAMP for dates).
```

## 2. Voice-to-ERD Conversion Prompt

```
You are a database design expert. Convert this natural language description into a structured database schema.

User Description: "{voice_transcript}"

Extract and structure:
1. **Entities**: What are the main objects/concepts?
2. **Attributes**: What properties does each entity have?
3. **Relationships**: How do entities relate to each other?
4. **Business Rules**: Any constraints or special requirements?

Return response in this exact JSON format:
{
  "schema_name": "generated_from_voice",
  "description": "Brief summary of the system",
  "tables": [
    {
      "name": "entity_name",
      "purpose": "What this table represents",
      "columns": [
        {
          "name": "column_name",
          "type": "PostgreSQL_data_type",
          "constraints": ["PRIMARY KEY", "NOT NULL", "UNIQUE"],
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

Use PostgreSQL data types: TEXT, INTEGER, DECIMAL, BOOLEAN, TIMESTAMP, UUID, JSONB.
Always include id (UUID PRIMARY KEY) and created_at/updated_at (TIMESTAMP) columns.
```

## 3. Mock Data Generation Prompt

```
Generate realistic mock data for this database schema:

Schema: {schema_json}
Records needed: {record_count} per table

Requirements:
1. **Realistic Data**: Use believable names, emails, addresses, phone numbers
2. **Referential Integrity**: Ensure foreign keys reference existing records
3. **Data Variety**: Mix of different scenarios and edge cases
4. **Business Logic**: Follow real-world patterns and constraints

Return response as SQL INSERT statements:
```sql
-- Table: table_name
INSERT INTO table_name (column1, column2, column3) VALUES
('value1', 'value2', 'value3'),
('value1', 'value2', 'value3');
```

Guidelines:
- Use realistic names from diverse backgrounds
- Generate valid email formats (name@domain.com)
- Use proper phone number formats
- Create logical date ranges
- Ensure data relationships make business sense
- Include some NULL values where appropriate
```

## 4. Natural Language to SQL Prompt

```
You are a PostgreSQL expert. Convert this natural language query to SQL:

User Query: "{natural_language_query}"
Available Tables: {table_schemas}

Rules:
1. **Security**: Only generate SELECT statements (no INSERT, UPDATE, DELETE, DROP)
2. **Accuracy**: Use exact table and column names from schema
3. **Optimization**: Use appropriate JOINs, indexes, and WHERE clauses
4. **Clarity**: Add comments explaining complex logic

Return response in this format:
{
  "sql": "SELECT statement here",
  "explanation": "Plain English explanation of what the query does",
  "tables_used": ["table1", "table2"],
  "estimated_complexity": "low|medium|high"
}

If the query seems potentially harmful or unclear, return:
{
  "error": "Explanation of why query cannot be processed",
  "suggestion": "Alternative approach or clarification needed"
}
```

## 5. API Generation Prompt

```
Generate a complete REST API specification for this database schema:

Schema: {schema_json}
Security Level: {security_config}

Generate:
1. **OpenAPI 3.0 Specification**
2. **CRUD Endpoints** for each table
3. **Relationship Endpoints** for foreign key navigation
4. **Security Schemas** based on requirements
5. **Request/Response Models**

Return OpenAPI spec with:
- Authentication (JWT Bearer tokens)
- Rate limiting headers
- Proper HTTP status codes
- Request validation schemas
- Response examples
- Error handling

Security Levels:
- **public**: No authentication required
- **authenticated**: JWT token required
- **role_based**: Role-specific permissions
- **row_level**: User can only access their own data

Include these standard endpoints per table:
- GET /api/{table} - List with pagination
- POST /api/{table} - Create new record
- GET /api/{table}/{id} - Get specific record
- PUT /api/{table}/{id} - Update record
- DELETE /api/{table}/{id} - Delete record
- GET /api/{table}/{id}/{relationship} - Get related records
```

## 6. Deployment Configuration Prompt

```
Generate deployment configuration for this API:

API Specification: {openapi_spec}
Target Platform: {platform} (azure|aws|local)
Environment: {environment} (development|staging|production)

Generate:
1. **Infrastructure as Code** (Terraform/ARM templates)
2. **Environment Variables** configuration
3. **CI/CD Pipeline** (GitHub Actions/Azure DevOps)
4. **Monitoring Setup** (Application Insights/CloudWatch)
5. **Security Configuration** (API Gateway, CORS, rate limiting)

Platform-specific requirements:
- **Azure**: Function Apps, API Management, Key Vault
- **AWS**: Lambda, API Gateway, Parameter Store
- **Local**: Docker Compose, environment files

Include:
- Auto-scaling configuration
- Health check endpoints
- Logging and monitoring
- Security headers and policies
- Database connection pooling
- Error handling and retry logic
```

## 7. Security Policy Generation Prompt

```
Generate comprehensive security policies for this system:

Schema: {schema_json}
User Roles: {user_roles}
Access Requirements: {access_requirements}

Generate:
1. **Row-Level Security (RLS) Policies** for PostgreSQL
2. **API Gateway Policies** for endpoint access
3. **JWT Token Configuration** with proper claims
4. **Data Masking Rules** for sensitive fields
5. **Audit Logging** configuration

Security Scenarios:
- **Admin**: Full access to all tables and operations
- **User**: Access only to their own data
- **ReadOnly**: SELECT permissions only
- **Service**: API-to-API communication

Generate PostgreSQL RLS policies:
```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY user_access_policy ON table_name
FOR ALL TO authenticated_user
USING (user_id = current_setting('app.current_user_id')::uuid);
```

Include data masking for:
- Email addresses (show only domain)
- Phone numbers (mask middle digits)
- Credit card numbers (show only last 4 digits)
- Social security numbers (full masking)
```