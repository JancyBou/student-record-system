const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Secure Connection Pool configuration for Neon Postgres
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// 1. CREATE: Add a new student (POST)
app.post('/api/students', async (req, res) => {
    const { firstName, lastName, email, age, course } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'First name, Last name, and Email are required.' });
    }

    try {
        const query = 'INSERT INTO students (first_name, last_name, email, age, course) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const result = await db.query(query, [firstName, lastName, email, age || null, course || null]);
        res.status(201).json({ id: result.rows[0].id, firstName, lastName, email, age, course });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Database error occurred: ' + err.message });
    }
});

// 2. READ: Get all students (GET)
app.get('/api/students', async (req, res) => {
    try {
        const query = 'SELECT id, first_name AS "firstName", last_name AS "lastName", email, age, course FROM students ORDER BY id DESC';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error occurred: ' + err.message });
    }
});

// 3. UPDATE: Modify an existing student (PUT)
app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, age, course } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'Required fields missing for update.' });
    }

    try {
        const query = 'UPDATE students SET first_name = $1, last_name = $2, email = $3, age = $4, course = $5 WHERE id = $6';
        const result = await db.query(query, [firstName, lastName, email, age || null, course || null, id]);
        
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ message: 'Student updated successfully.', id });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error occurred: ' + err.message });
    }
});

// 4. DELETE: Remove a student (DELETE)
app.delete('/api/students/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM students WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found.' });
        res.json({ message: 'Student deleted successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error occurred: ' + err.message });
    }
});

// Export the app context for Vercel
module.exports = app;

// Listen locally during development
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server running locally on port ${PORT}`));
}