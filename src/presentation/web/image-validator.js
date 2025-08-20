// Enhanced ERD Image Validator with Stricter Validation
class ERDImageValidator {
    constructor() {
        this.minWidth = 200;
        this.minHeight = 150;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    }

    async validateERDImage(file) {
        const errors = [];
        
        // Basic file validation
        if (!this.allowedTypes.includes(file.type)) {
            errors.push('Invalid file type. Use JPG, PNG, GIF, or WebP');
        }
        
        if (file.size > this.maxFileSize) {
            errors.push('File too large. Maximum 10MB allowed');
        }
        
        // Image dimension validation
        const dimensions = await this.getImageDimensions(file);
        if (dimensions.width < this.minWidth || dimensions.height < this.minHeight) {
            errors.push(`Image too small. Minimum ${this.minWidth}x${this.minHeight} required`);
        }
        
        // ERD content validation
        const erdScore = await this.analyzeERDContent(file);
        if (erdScore < 0.3) {
            errors.push('Image does not appear to contain ERD structures');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            erdScore,
            dimensions
        };
    }

    async getImageDimensions(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = URL.createObjectURL(file);
        });
    }

    async analyzeERDContent(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const score = this.calculateERDScore(imageData);
                resolve(score);
            };
            
            img.onerror = () => resolve(0);
            img.src = URL.createObjectURL(file);
        });
    }

    calculateERDScore(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let rectangles = 0;
        let lines = 0;
        let textRegions = 0;
        
        // Detect rectangular shapes (tables)
        for (let y = 0; y < height - 30; y += 15) {
            for (let x = 0; x < width - 40; x += 20) {
                if (this.isRectangularRegion(pixels, x, y, 40, 30, width)) {
                    rectangles++;
                }
            }
        }
        
        // Detect lines (relationships)
        for (let y = 0; y < height; y += 10) {
            if (this.hasHorizontalLine(pixels, y, width)) lines++;
        }
        
        // Detect text regions
        for (let y = 0; y < height - 20; y += 20) {
            for (let x = 0; x < width - 20; x += 20) {
                if (this.hasTextPattern(pixels, x, y, 20, width)) {
                    textRegions++;
                }
            }
        }
        
        // Calculate ERD score
        const rectScore = Math.min(rectangles / 3, 1) * 0.5;
        const lineScore = Math.min(lines / 2, 1) * 0.3;
        const textScore = Math.min(textRegions / 5, 1) * 0.2;
        
        return rectScore + lineScore + textScore;
    }

    isRectangularRegion(pixels, x, y, w, h, imgWidth) {
        let borderPixels = 0;
        const totalBorder = 2 * (w + h);
        
        // Check borders
        for (let i = 0; i < w; i++) {
            if (this.isDark(pixels, (y * imgWidth + x + i) * 4)) borderPixels++;
            if (this.isDark(pixels, ((y + h) * imgWidth + x + i) * 4)) borderPixels++;
        }
        
        for (let i = 0; i < h; i++) {
            if (this.isDark(pixels, ((y + i) * imgWidth + x) * 4)) borderPixels++;
            if (this.isDark(pixels, ((y + i) * imgWidth + x + w) * 4)) borderPixels++;
        }
        
        return (borderPixels / totalBorder) > 0.4;
    }

    hasHorizontalLine(pixels, y, width) {
        let darkPixels = 0;
        for (let x = 0; x < width; x += 5) {
            if (this.isDark(pixels, (y * width + x) * 4)) darkPixels++;
        }
        return (darkPixels / (width / 5)) > 0.6;
    }

    hasTextPattern(pixels, x, y, size, width) {
        let variance = 0;
        let mean = 0;
        const totalPixels = size * size;
        
        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const idx = ((y + py) * width + (x + px)) * 4;
                const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                mean += brightness;
            }
        }
        mean /= totalPixels;
        
        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const idx = ((y + py) * width + (x + px)) * 4;
                const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                variance += Math.pow(brightness - mean, 2);
            }
        }
        variance /= totalPixels;
        
        return variance > 1500 && mean > 50 && mean < 200;
    }

    isDark(pixels, idx) {
        if (idx >= pixels.length - 2) return false;
        const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        return brightness < 128;
    }
}

// Enhanced validation with user feedback
async function validateAndProcessERD(files) {
    const validator = new ERDImageValidator();
    const results = [];
    
    for (const file of files) {
        const validation = await validator.validateERDImage(file);
        
        if (!validation.isValid) {
            showValidationErrors(validation.errors, file.name);
            continue;
        }
        
        if (validation.erdScore < 0.5) {
            const proceed = await confirmLowERDScore(validation.erdScore, file.name);
            if (!proceed) continue;
        }
        
        results.push({ file, validation });
    }
    
    return results;
}

function showValidationErrors(errors, filename) {
    const errorHTML = `
        <div class="fixed top-4 right-4 bg-red-900 border border-red-500 text-white p-4 rounded-lg z-50 max-w-sm">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-red-200">❌ Validation Failed</h4>
                <button onclick="this.parentElement.parentElement.remove()" class="text-red-300 hover:text-white">×</button>
            </div>
            <div class="text-sm mb-2 font-medium">${filename}</div>
            <ul class="text-sm space-y-1">
                ${errors.map(error => `<li>• ${error}</li>`).join('')}
            </ul>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', errorHTML);
    
    setTimeout(() => {
        const errorDiv = document.querySelector('.fixed.top-4.right-4.bg-red-900');
        if (errorDiv) errorDiv.remove();
    }, 8000);
}

async function confirmLowERDScore(score, filename) {
    return new Promise((resolve) => {
        const confirmHTML = `
            <div id="erdConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-gray-800 p-6 rounded-lg border border-yellow-500 max-w-md">
                    <h3 class="text-yellow-400 font-bold mb-3">⚠️ Low ERD Confidence</h3>
                    <p class="text-gray-300 mb-4">${filename} has low ERD confidence (${Math.round(score * 100)}%). Continue anyway?</p>
                    <div class="flex space-x-3">
                        <button onclick="resolveERDConfirm(true)" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">
                            Continue
                        </button>
                        <button onclick="resolveERDConfirm(false)" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', confirmHTML);
        
        window.resolveERDConfirm = (result) => {
            document.getElementById('erdConfirm').remove();
            delete window.resolveERDConfirm;
            resolve(result);
        };
    });
}

// Export for global use
window.ERDImageValidator = ERDImageValidator;
window.validateAndProcessERD = validateAndProcessERD;