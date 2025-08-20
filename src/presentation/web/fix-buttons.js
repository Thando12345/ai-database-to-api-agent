// Fix missing button functions

function generateDemoAPICode() {
    return `const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/users', (req, res) => {
    res.json([{id: 1, name: 'John Doe'}]);
});

app.post('/api/users', (req, res) => {
    res.json({id: 2, ...req.body});
});

app.listen(3000, () => console.log('Server running'));`;
}

async function fallbackSQLGeneration(query) {
    const words = query.toLowerCase();
    let sql = 'SELECT * FROM users';
    let result = [{id: 1, name: 'Sample User'}];
    
    if (words.includes('product')) {
        sql = 'SELECT * FROM products';
        result = [{id: 1, name: 'Sample Product', price: 99.99}];
    }
    
    return {sql, result};
}