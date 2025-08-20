async function analyzeTextERD() {
    const textERD = document.getElementById('textERD').value.trim();
    if (!textERD) {
        showToast('Please enter a description', 'error');
        return;
    }
    
    showToast('🔍 Analyzing text description...', 'info');
    
    try {
        const response = await fetch('/api/analyze-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textERD })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Text analysis complete!', 'success');
            
            // Generate schema and API
            const schemaResponse = await fetch('/api/generate-schema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis: result.analysis })
            });
            
            const apiResponse = await fetch('/api/generate-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis: result.analysis })
            });
            
            const schemaResult = await schemaResponse.json();
            const apiResult = await apiResponse.json();
            
            currentGeneratedSchema = schemaResult.schema;
            currentGeneratedAPI = apiResult.apiCode;
            
            displayEnhancedResults({
                schema: schemaResult.schema,
                apiCode: apiResult.apiCode,
                erdImage: result.erdImage,
                textInput: textERD
            });
            
            saveSession({
                type: 'text',
                input: textERD,
                schema: schemaResult.schema,
                apiCode: apiResult.apiCode
            });
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('Text analysis error:', error);
        showToast('❌ Text analysis failed: ' + error.message, 'error');
    }
}