require('dotenv').config();
const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// Fixed: Configured for Neon using single connectionString + SSL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false 
    }
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

// 1. CREATE: Add a new student (POST)
app.post('/api/students', (req, res) => {
    // Fixed: Matches your frontend payload structure
    const { firstName, lastName, email, age, course } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'First name, Last name, and Email are required.' });
    }

    // Fixed: Matches your table structure (students)
    const query = 'INSERT INTO students (first_name, last_name, email, age, course) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    db.query(query, [firstName, lastName, email, age || null, course || null], (err, result) => {
        if (err) {
            if (err.code === '23505') {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.status(201).json({ id: result.rows[0].id, firstName, lastName, email, age, course });
    });
});

// 2. READ: Get all students (GET)
app.get('/api/students', (req, res) => {
    // Fixed: Target the correct "students" table
    const query = 'SELECT id, first_name AS "firstName", last_name AS "lastName", email, age, course FROM students ORDER BY id DESC';
    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.json(result.rows); 
    });
});

// 3. UPDATE: Modify an existing student (PUT)
app.put('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, age, course } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'Required fields missing for update.' });
    }

    // Fixed: Updated to match your database columns
    const query = 'UPDATE students SET first_name = $1, last_name = $2, email = $3, age = $4, course = $5 WHERE id = $6';
    db.query(query, [firstName, lastName, email, age || null, course || null, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student updated successfully.', id });
    });
});

// 4. DELETE: Remove a student (DELETE)
app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;

    // Fixed: Target correct table name
    db.query('DELETE FROM students WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        
        res.json({ message: 'Student deleted successfully.' });
    });
});

const PORT = process.env.PORT || 3000;
// Fixed: Added backticks to string interpolation syntax
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));