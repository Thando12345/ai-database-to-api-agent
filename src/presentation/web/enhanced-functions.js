// Enhanced Functions with Improved Suggestion Handling
class SuggestionManager {
    constructor() {
        this.suggestions = [];
        this.container = null;
    }

    showSuggestions(suggestions, targetElement) {
        this.suggestions = suggestions;
        this.createSuggestionContainer(targetElement);
        this.renderSuggestions();
    }

    createSuggestionContainer(targetElement) {
        // Remove existing container
        if (this.container) this.container.remove();
        
        this.container = document.createElement('div');
        this.container.className = 'suggestion-container absolute z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl max-w-md';
        this.container.style.cssText = `
            top: ${targetElement.offsetTop + targetElement.offsetHeight + 5}px;
            left: ${targetElement.offsetLeft}px;
        `;
        
        document.body.appendChild(this.container);
    }

    renderSuggestions() {
        if (!this.container) return;
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-3';
        header.innerHTML = `
            <span class="text-white font-medium text-sm">💡 Suggestions</span>
            <button onclick="suggestionManager.closeSuggestions()" class="text-gray-400 hover:text-white text-lg">×</button>
        `;
        
        const suggestionList = document.createElement('div');
        suggestionList.className = 'space-y-2';
        
        this.suggestions.forEach((suggestion, index) => {
            const chip = this.createSuggestionChip(suggestion, index);
            suggestionList.appendChild(chip);
        });
        
        this.container.appendChild(header);
        this.container.appendChild(suggestionList);
    }

    createSuggestionChip(suggestion, index) {
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg cursor-pointer transition-colors flex justify-between items-center';
        chip.innerHTML = `
            <span class="text-sm">${suggestion}</span>
            <button onclick="suggestionManager.removeSuggestion(${index})" class="text-blue-200 hover:text-white ml-2">×</button>
        `;
        
        chip.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                this.applySuggestion(suggestion);
            }
        });
        
        return chip;
    }

    applySuggestion(suggestion) {
        const textArea = document.getElementById('textERD');
        if (textArea) {
            textArea.value = suggestion;
            textArea.focus();
            this.closeSuggestions();
            
            // Trigger analysis
            if (window.analyzeTextERD) {
                window.analyzeTextERD();
            }
        }
    }

    removeSuggestion(index) {
        this.suggestions.splice(index, 1);
        if (this.suggestions.length === 0) {
            this.closeSuggestions();
        } else {
            this.renderSuggestions();
        }
    }

    closeSuggestions() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.suggestions = [];
    }
}

// Enhanced text-to-ERD with suggestions
function enhanceTextToERD() {
    const textArea = document.getElementById('textERD');
    if (!textArea) return;
    
    // Add suggestion trigger
    textArea.addEventListener('input', debounce(() => {
        const text = textArea.value.trim();
        if (text.length > 10) {
            generateSmartSuggestions(text);
        }
    }, 1000));
    
    // Add focus handler
    textArea.addEventListener('focus', () => {
        if (!textArea.value.trim()) {
            showDefaultSuggestions();
        }
    });
}

function generateSmartSuggestions(text) {
    const suggestions = [];
    const lowerText = text.toLowerCase();
    
    // Context-aware suggestions
    if (lowerText.includes('user') && !lowerText.includes('profile')) {
        suggestions.push('Add user profiles with personal information');
    }
    
    if (lowerText.includes('product') && !lowerText.includes('category')) {
        suggestions.push('Include product categories for better organization');
    }
    
    if (lowerText.includes('order') && !lowerText.includes('payment')) {
        suggestions.push('Add payment information for orders');
    }
    
    if (!lowerText.includes('timestamp') && !lowerText.includes('created')) {
        suggestions.push('Include timestamps for data tracking');
    }
    
    if (suggestions.length > 0) {
        suggestionManager.showSuggestions(suggestions, document.getElementById('textERD'));
    }
}

function showDefaultSuggestions() {
    const defaultSuggestions = [
        'E-commerce system with customers, products, and orders',
        'Blog platform with users, posts, and comments',
        'Library system with books, authors, and borrowers',
        'School database with students, courses, and enrollments',
        'Inventory system with items, suppliers, and transactions'
    ];
    
    suggestionManager.showSuggestions(defaultSuggestions, document.getElementById('textERD'));
}

// Utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize suggestion manager
const suggestionManager = new SuggestionManager();

// Auto-enhance on load
document.addEventListener('DOMContentLoaded', () => {
    enhanceTextToERD();
});

// Export for global use
window.suggestionManager = suggestionManager;
window.enhanceTextToERD = enhanceTextToERD;