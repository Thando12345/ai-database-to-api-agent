// ERD Download and Generation Functions

let currentERDImage = null;

function downloadERDDiagram() {
    // Generate ERD from current schema
    if (currentGeneratedSchema) {
        const analysis = parseSchemaToAnalysis(currentGeneratedSchema);
        const erdSvg = generateSVGERD(analysis);
        downloadSVG(erdSvg);
    } else {
        showToast('❌ No schema available', 'error');
    }
}

function generateSVGERD(analysis) {
    const width = 800;
    const height = 600;
    const tableWidth = 200;
    const tableHeight = 120;
    const spacing = 250;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="#f8f9fa"/>`;
    svg += `<text x="50" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="#2c3e50">Entity Relationship Diagram</text>`;
    
    let yPos = 80;
    const tablePositions = {};
    
    // Draw tables and store positions
    analysis.tables.forEach((table, index) => {
        const xPos = 50 + (index % 3) * spacing;
        const currentY = yPos + Math.floor(index / 3) * 180;
        
        tablePositions[table.name] = { x: xPos, y: currentY, width: tableWidth, height: tableHeight };
        
        svg += `<rect x="${xPos}" y="${currentY}" width="${tableWidth}" height="${tableHeight}" fill="#3498db" stroke="#2980b9"/>`;
        svg += `<rect x="${xPos}" y="${currentY}" width="${tableWidth}" height="30" fill="#2980b9"/>`;
        svg += `<text x="${xPos + 10}" y="${currentY + 20}" font-family="Arial" font-size="16" font-weight="bold" fill="white">${table.name.toUpperCase()}</text>`;
        
        table.columns.forEach((col, colIndex) => {
            const isPK = col.constraints && col.constraints.includes('PRIMARY KEY');
            const isFK = col.name.includes('_id') && !isPK;
            const text = `${isPK ? 'PK ' : isFK ? 'FK ' : ''}${col.name}: ${col.type}`;
            svg += `<text x="${xPos + 10}" y="${currentY + 50 + (colIndex * 15)}" font-family="Arial" font-size="12" fill="#2c3e50">${text}</text>`;
        });
    });
    
    // Draw ER relationship lines
    const tableNames = Object.keys(tablePositions);
    if (tableNames.length >= 2) {
        for (let i = 0; i < tableNames.length - 1; i++) {
            const from = tablePositions[tableNames[i]];
            const to = tablePositions[tableNames[i + 1]];
            
            const fromX = from.x + from.width;
            const fromY = from.y + from.height / 2;
            const toX = to.x;
            const toY = to.y + to.height / 2;
            
            // Main connection line
            svg += `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="#2c3e50" stroke-width="2"/>`;
            
            // One side (single line)
            svg += `<line x1="${fromX}" y1="${fromY - 5}" x2="${fromX}" y2="${fromY + 5}" stroke="#2c3e50" stroke-width="2"/>`;
            
            // Many side (crow's foot)
            svg += `<line x1="${toX}" y1="${toY}" x2="${toX - 10}" y2="${toY - 5}" stroke="#2c3e50" stroke-width="2"/>`;
            svg += `<line x1="${toX}" y1="${toY}" x2="${toX - 10}" y2="${toY + 5}" stroke="#2c3e50" stroke-width="2"/>`;
            svg += `<line x1="${toX}" y1="${toY}" x2="${toX - 10}" y2="${toY}" stroke="#2c3e50" stroke-width="2"/>`;
        }
    }
    
    svg += `<text x="50" y="580" font-family="Arial" font-size="10" fill="#7f8c8d">Generated: ${new Date().toLocaleString()}</text>`;
    svg += '</svg>';
    
    return svg;
}

function downloadSVG(svgContent) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erd-diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('💾 ERD downloaded!', 'success');
}

function parseSchemaToAnalysis(schema) {
    const tables = [];
    const tableMatches = schema.match(/CREATE TABLE (\w+)\s*\([^;]+\);/gi);
    
    if (tableMatches) {
        tableMatches.forEach(tableMatch => {
            const nameMatch = tableMatch.match(/CREATE TABLE (\w+)/i);
            if (nameMatch) {
                const tableName = nameMatch[1];
                const columns = [];
                
                const columnMatches = tableMatch.match(/(\w+)\s+(VARCHAR|INT|INTEGER|TEXT|SERIAL|TIMESTAMP|DATE|DECIMAL|UUID)\s*[^,\n]*/gi);
                if (columnMatches) {
                    columnMatches.forEach(colMatch => {
                        const colParts = colMatch.trim().split(/\s+/);
                        if (colParts.length >= 2) {
                            const constraints = [];
                            if (colMatch.includes('PRIMARY KEY')) constraints.push('PRIMARY KEY');
                            if (colMatch.includes('NOT NULL')) constraints.push('NOT NULL');
                            if (colMatch.includes('UNIQUE')) constraints.push('UNIQUE');
                            
                            columns.push({
                                name: colParts[0],
                                type: colParts[1],
                                constraints: constraints
                            });
                        }
                    });
                }
                
                tables.push({ name: tableName, columns });
            }
        });
    }
    
    return { tables, relationships: [] };
}

// Enhanced displayEnhancedResults to store ERD image
function displayEnhancedResults(result) {
    const resultsDiv = document.getElementById('results');
    const content = document.getElementById('resultContent');
    
    // Store ERD image for download
    if (result.erdImage) {
        currentERDImage = result.erdImage;
    }
    
    // Create enhanced results display
    let resultHTML = '<div class="space-y-4">';
    
    // Show ERD preview if available
    if (result.erdImage) {
        resultHTML += '<div class="mb-4">';
        resultHTML += '<h4 class="text-white font-semibold mb-2">📊 Generated ERD Diagram:</h4>';
        resultHTML += '<div class="bg-white rounded-lg p-2 inline-block">';
        resultHTML += `<img src="${result.erdImage}" alt="ERD Diagram" class="max-w-xs h-auto cursor-pointer" onclick="showERDImageModal('${result.erdImage}')">`;
        resultHTML += '</div>';
        resultHTML += '<p class="text-gray-400 text-sm mt-2">Click image to view full size and download options</p>';
        resultHTML += '</div>';
    }
    
    // Show processed images
    if (uploadedImages && uploadedImages.length > 0) {
        resultHTML += '<div class="mb-4">';
        resultHTML += '<h4 class="text-white font-semibold mb-2">📸 Processed Images:</h4>';
        resultHTML += '<div class="flex space-x-2 overflow-x-auto">';
        
        uploadedImages.forEach((img, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgElement = document.createElement('img');
                imgElement.src = e.target.result;
                imgElement.className = 'w-16 h-16 object-cover rounded border border-gray-600';
                imgElement.alt = `Processed ERD ${index + 1}`;
                
                const container = document.getElementById(`processedImg${index}`);
                if (container) container.appendChild(imgElement);
            };
            reader.readAsDataURL(img.file);
            
            resultHTML += `<div id="processedImg${index}" class="flex-shrink-0 w-16 h-16 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">`;
            resultHTML += '<span class="text-gray-400 text-xs">📷</span>';
            resultHTML += '</div>';
        });
        
        resultHTML += '</div></div>';
    }
    
    resultHTML += '<div class="bg-gray-900/50 p-4 rounded-xl">';
    resultHTML += '<h4 class="text-green-400 font-semibold mb-3">🎉 ANALYSIS COMPLETE!</h4>';
    resultHTML += '<div class="space-y-2 text-gray-300">';
    resultHTML += '<div>📊 <strong>ERD:</strong> Visual diagram generated and ready for download</div>';
    resultHTML += '<div>📊 <strong>Schema:</strong> SQL database structure created</div>';
    resultHTML += '<div>⚡ <strong>API:</strong> Full CRUD operations ready</div>';
    resultHTML += '<div>🔒 <strong>Security:</strong> Authentication & validation included</div>';
    resultHTML += '</div>';
    resultHTML += '<div class="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-500/30">';
    resultHTML += '<div class="text-green-400 font-medium">✅ Ready for deployment and testing!</div>';
    resultHTML += '</div>';
    resultHTML += '</div>';
    resultHTML += '</div>';
    
    content.innerHTML = resultHTML;
    resultsDiv.classList.remove('hidden');
}