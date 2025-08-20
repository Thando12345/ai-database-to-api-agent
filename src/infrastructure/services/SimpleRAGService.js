// Minimal RAG Service for AI Agent
const OpenAI = require('openai');

class SimpleRAGService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.knowledgeBase = [
            "Hospital ERD includes: patients (patient_id, name, age, phone), doctors (doctor_id, name, specialty), appointments (appointment_id, patient_id, doctor_id, date_time), medical_records (record_id, patient_id, diagnosis, treatment)",
            "School database schema: students (student_id, name, email, grade), teachers (teacher_id, name, subject), courses (course_id, name, teacher_id), enrollments (enrollment_id, student_id, course_id, grade)",
            "E-commerce database: customers (customer_id, name, email), products (product_id, name, price, stock), orders (order_id, customer_id, total), order_items (item_id, order_id, product_id, quantity)",
            "Library system: books (book_id, title, author, isbn), members (member_id, name, email), borrowings (borrowing_id, book_id, member_id, borrow_date, return_date)",
            "Blog/CMS schema: users (user_id, username, email), posts (post_id, user_id, title, content), comments (comment_id, post_id, user_id, content)",
            "VoIP calls use WebRTC for real-time peer-to-peer communication with STUN/TURN servers",
            "ERD analysis requires identifying tables (rectangles), columns (text inside), relationships (connecting lines), primary keys (PK), foreign keys (FK)"
        ];
        this.embeddings = null;
        this.initializeEmbeddings();
    }

    async initializeEmbeddings() {
        // Skip embeddings to avoid quota issues
        console.log('✅ RAG using keyword matching (embeddings disabled)');
        this.embeddings = null;
    }

    async getRelevantContext(query) {
        // Use keyword matching instead of embeddings
        const keywords = query.toLowerCase().split(' ');
        
        for (const doc of this.knowledgeBase) {
            const docLower = doc.toLowerCase();
            if (keywords.some(keyword => docLower.includes(keyword))) {
                return doc;
            }
        }
        
        return '';
    }

    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async generateRAGResponse(query) {
        const context = await this.getRelevantContext(query);
        
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert database architect. Use the provided context to give accurate, detailed responses about database design."
                },
                {
                    role: "user",
                    content: context ? 
                        `Context: ${context}\n\nQuestion: ${query}` : 
                        `Question: ${query}`
                }
            ],
            max_tokens: 300,
            temperature: 0.3
        });

        return response.choices[0].message.content;
    }
}

module.exports = SimpleRAGService;