require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves our frontend

// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to FreeSQL Database.');
    connection.release();
});

// --- RESTful API ROUTES (CRUD) ---

// 1. CREATE: Add a new student (POST)
app.post('/api/students', (req, res) => {
    const { name, email, course } = req.body;

    // Input Validation
    if (!name || !email || !course) {
        return res.status(400).json({ error: 'All fields (name, email, course) are required.' });
    }

    const query = 'INSERT INTO students (name, email, course) VALUES (?, ?, ?)';
    db.query(query, [name, email, course], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.status(201).json({ id: result.insertId, name, email, course });
    });
});

// 2. READ: Get all students (GET)
app.get('/api/students', (req, res) => {
    db.query('SELECT * FROM students', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error occurred.' });
        res.json(results);
    });
});

// 3. UPDATE: Modify an existing student (PUT)
app.put('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, course } = req.body;

    // Input Validation
    if (!name || !email || !course) {
        return res.status(400).json({ error: 'All fields are required for updates.' });
    }

    const query = 'UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?';
    db.query(query, [name, email, course, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error occurred.' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student updated successfully.', id, name, email, course });
    });
});

// 4. DELETE: Remove a student (DELETE)
app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM students WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error occurred.' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student deleted successfully.' });
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));