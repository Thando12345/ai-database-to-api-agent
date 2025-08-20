// Real-time validation service
class RealTimeValidator {
    static validateImageUpload(file) {
        const errors = [];
        
        // File type validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errors.push('Invalid file type. Use JPG, PNG, GIF, or WebP');
        }
        
        // File size validation (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            errors.push('File too large. Maximum 10MB allowed');
        }
        
        // Image dimensions validation
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (img.width < 100 || img.height < 100) {
                    errors.push('Image too small. Minimum 100x100 pixels');
                }
                if (img.width > 4000 || img.height > 4000) {
                    errors.push('Image too large. Maximum 4000x4000 pixels');
                }
                resolve({ valid: errors.length === 0, errors });
            };
            img.onerror = () => {
                errors.push('Invalid image file');
                resolve({ valid: false, errors });
            };
            img.src = URL.createObjectURL(file);
        });
    }
    
    static validateERDAnalysis(analysis) {
        const errors = [];
        
        if (!analysis || typeof analysis !== 'object') {
            errors.push('Invalid analysis format');
            return { valid: false, errors };
        }
        
        if (!analysis.tables || !Array.isArray(analysis.tables)) {
            errors.push('No tables found in analysis');
            return { valid: false, errors };
        }
        
        if (analysis.tables.length === 0) {
            errors.push('Empty table list');
            return { valid: false, errors };
        }
        
        // Validate table structure
        analysis.tables.forEach((table, index) => {
            if (!table.name) {
                errors.push(`Table ${index + 1}: Missing name`);
            }
            if (!table.columns || !Array.isArray(table.columns)) {
                errors.push(`Table ${table.name}: Missing columns`);
            } else if (table.columns.length === 0) {
                errors.push(`Table ${table.name}: No columns defined`);
            }
        });
        
        return { valid: errors.length === 0, errors, score: this.calculateQualityScore(analysis) };
    }
    
    static calculateQualityScore(analysis) {
        let score = 0;
        
        // Base score for having tables
        if (analysis.tables && analysis.tables.length > 0) score += 30;
        
        // Score for table quality
        analysis.tables.forEach(table => {
            if (table.name) score += 10;
            if (table.columns && table.columns.length > 0) score += 20;
            
            // Score for column quality
            table.columns.forEach(column => {
                if (column.name) score += 2;
                if (column.type) score += 2;
                if (column.constraints && column.constraints.length > 0) score += 1;
            });
        });
        
        // Score for relationships
        if (analysis.relationships && analysis.relationships.length > 0) {
            score += analysis.relationships.length * 5;
        }
        
        return Math.min(100, score);
    }
    
    static validateVoIPCall(phoneNumber) {
        const errors = [];
        
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            errors.push('Phone number is required');
            return { valid: false, errors };
        }
        
        // Remove spaces and special characters for validation
        const cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
        
        if (cleaned.length < 10) {
            errors.push('Phone number too short (minimum 10 digits)');
        }
        
        if (cleaned.length > 15) {
            errors.push('Phone number too long (maximum 15 digits)');
        }
        
        if (!/^\d+$/.test(cleaned)) {
            errors.push('Phone number contains invalid characters');
        }
        
        return { valid: errors.length === 0, errors, formatted: cleaned };
    }
    
    static validateRealTimeResponse(response) {
        const errors = [];
        
        if (!response || typeof response !== 'string') {
            errors.push('Invalid response format');
            return { valid: false, errors };
        }
        
        if (response.length < 10) {
            errors.push('Response too short');
        }
        
        if (response.length > 1000) {
            errors.push('Response too long');
        }
        
        // Check for meaningful content
        const meaningfulWords = ['database', 'table', 'schema', 'column', 'relationship', 'create', 'design'];
        const hasContent = meaningfulWords.some(word => response.toLowerCase().includes(word));
        
        if (!hasContent) {
            errors.push('Response lacks database-related content');
        }
        
        return { valid: errors.length === 0, errors };
    }
}

module.exports = RealTimeValidator;