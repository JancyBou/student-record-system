require('dotenv').config();
const express = require('express');
const { Pool } = require('pg'); // Switched from mysql2 to pg
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves our frontend

// PostgreSQL Connection Pool
const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432, // Added standard Postgres port
    max: 10, // Equivalent to connectionLimit
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test Connection
db.connect((err, client, release) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to PostgreSQL Database.');
    release();
});

// --- RESTful API ROUTES (CRUD) ---

// 1. CREATE: Add a new student (POST)
app.post('/api/students', (req, res) => {
    const { name, email, course } = req.body;

    // Input Validation
    if (!name || !email || !course) {
        return res.status(400).json({ error: 'All fields (name, email, course) are required.' });
    }

    // Postgres uses $1, $2, $3 and sys_app_students table. 
    // Added 'RETURNING id' to easily capture the generated ID.
    const query = 'INSERT INTO sys_app_students (student_name, student_email, student_course) VALUES ($1, $2, $3) RETURNING id';
    db.query(query, [name, email, course], (err, result) => {
        if (err) {
            // Postgres unique constraint error code is '23505'
            if (err.code === '23505') {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.status(201).json({ id: result.rows[0].id, name, email, course });
    });
});

// 2. READ: Get all students (GET)
app.get('/api/students', (req, res) => {
    // Mapping table columns back to match your original API response structure
    const query = 'SELECT id, student_name AS name, student_email AS email, student_course AS course FROM sys_app_students';
    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.json(result.rows); // Postgres data lives inside result.rows
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

    const query = 'UPDATE sys_app_students SET student_name = $1, student_email = $2, student_course = $3 WHERE id = $4';
    db.query(query, [name, email, course, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        // Postgres uses rowCount instead of affectedRows
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student updated successfully.', id, name, email, course });
    });
});

// 4. DELETE: Remove a student (DELETE)
app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM sys_app_students WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        // Postgres uses rowCount instead of affectedRows
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student deleted successfully.' });
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));