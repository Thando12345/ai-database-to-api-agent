// ERD Image Generation Module
function generateERDImage(analysis) {
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 800, 600);
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Entity Relationship Diagram', 50, 40);
    
    // Draw tables
    let yPos = 80;
    const tableWidth = 200;
    const tableHeight = 120;
    const spacing = 250;
    
    analysis.tables.forEach((table, index) => {
        const xPos = 50 + (index % 3) * spacing;
        const currentY = yPos + Math.floor(index / 3) * 180;
        
        // Table box
        ctx.fillStyle = '#3498db';
        ctx.fillRect(xPos, currentY, tableWidth, tableHeight);
        
        // Table header
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(xPos, currentY, tableWidth, 30);
        
        // Table name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(table.name.toUpperCase(), xPos + 10, currentY + 20);
        
        // Columns
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        table.columns.forEach((col, colIndex) => {
            const isPK = col.constraints && col.constraints.includes('PRIMARY KEY');
            const text = `${isPK ? '🔑 ' : ''}${col.name}: ${col.type}`;
            ctx.fillText(text, xPos + 10, currentY + 50 + (colIndex * 15));
        });
    });
    
    // Add timestamp
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '10px Arial';
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 50, 580);
    
    return canvas.toDataURL('image/png');
}

// Show ERD Image Modal
function showERDImageModal(imageData, downloadUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 class="text-white font-semibold">📊 Generated ERD Diagram</h3>
                <button onclick="closeERDModal()" class="text-gray-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="p-6">
                <div class="bg-white rounded-lg p-4 mb-4">
                    <img src="${imageData}" alt="ERD Diagram" class="w-full h-auto">
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="downloadERDImage('${imageData}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-semibold">
                        💾 Download PNG
                    </button>
                    <button onclick="downloadERDPDF('${imageData}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold">
                        📄 Download PDF
                    </button>
                    <button onclick="shareERD('${imageData}')" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold">
                        📤 Share
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeERDModal() {
    const modal = document.querySelector('.fixed.inset-0.bg-black\\/90');
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

function downloadERDImage(imageData) {
    const link = document.createElement('a');
    link.download = `erd-diagram-${Date.now()}.png`;
    link.href = imageData;
    link.click();
    showToast('💾 ERD image downloaded!', 'success');
}

function downloadERDPDF(imageData) {
    // Create PDF with jsPDF (if available)
    if (typeof jsPDF !== 'undefined') {
        const pdf = new jsPDF();
        pdf.addImage(imageData, 'PNG', 10, 10, 190, 142);
        pdf.save(`erd-diagram-${Date.now()}.pdf`);
        showToast('📄 ERD PDF downloaded!', 'success');
    } else {
        // Fallback to PNG download
        downloadERDImage(imageData);
        showToast('📄 Downloaded as PNG (PDF library not loaded)', 'warning');
    }
}

function shareERD(imageData) {
    if (navigator.share) {
        // Convert data URL to blob
        fetch(imageData)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], 'erd-diagram.png', { type: 'image/png' });
                navigator.share({
                    title: 'ERD Diagram',
                    text: 'Check out this ERD diagram I generated!',
                    files: [file]
                });
            });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(imageData).then(() => {
            showToast('📤 ERD image data copied to clipboard!', 'success');
        });
    }
}

// Enhanced text analysis with ERD generation
async function analyzeTextERD() {
    const textArea = document.getElementById('textERD');
    const text = textArea.value.trim();
    
    if (!text) {
        showToast('Please enter a description', 'error');
        return;
    }
    
    showToast('🔍 Analyzing text and generating ERD...', 'info');
    
    try {
        const response = await fetch('/api/analyze-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const result = await response.json();
        
        if (result.success) {
            // Generate ERD image from analysis
            const erdImage = generateERDImage(result.analysis);
            
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
            
            // Store current results
            currentGeneratedSchema = schemaResult.schema;
            currentGeneratedAPI = apiResult.apiCode;
            
            // Display enhanced results immediately
            displayEnhancedResults({
                schema: schemaResult.schema,
                apiCode: apiResult.apiCode,
                textInput: text,
                erdImage: erdImage
            });
            
            saveSession({
                type: 'text',
                input: text,
                results: {
                    schema: schemaResult.schema,
                    apiCode: apiResult.apiCode,
                    erdImage: erdImage
                }
            });
            
            showToast('🎉 ERD diagram generated! Download buttons available below.', 'success');
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    } catch (error) {
        console.error('Text analysis error:', error);
        showToast('❌ Text analysis failed: ' + error.message, 'error');
    }
}