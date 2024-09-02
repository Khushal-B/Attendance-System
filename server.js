const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const cors = require('cors');



const app = express();
app.use(bodyParser.json());
app.use(cors());
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Attendence_System",
  password: "gOOgly12345",
  port: 5432,
});

db.connect();

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(email);
  console.log(password);

  try {
    const result = await db.query('SELECT * FROM teacher WHERE email_id = $1 AND password = $2', [email, password]);

    if (result.rows.length > 0) {
      // Login successful
      res.json({ message: 'Login successful!' });
    } else {
      // Invalid credentials
      res.status(401).json({ message: 'Wrong credentials, please try again.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Create lecture route
app.post('/api/create-lecture', async (req, res) => {
  const { topic, division, datetime } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO lecture (teacher_id, topic, division, time, date, qrcode) VALUES ($1, $2, $3, $4::time, $4::date, $5) RETURNING lecture_id',
      [1, topic, division, datetime, 'generated_qr_code']  // Assuming teacher_id = 1 for simplicity
    );

    const lecture_id = result.rows[0].lecture_id;
    const column_name_status = `status${lecture_id}`;
    const column_name_attendance = `atten${lecture_id}`;

    await db.query(`ALTER TABLE student ADD COLUMN ${column_name_status} INT DEFAULT 0`);
    await db.query(`ALTER TABLE student ADD COLUMN ${column_name_attendance} INT DEFAULT 0`);
    await db.query(`UPDATE student SET ${column_name_status} = 1 WHERE division = $1`, [division]);

    res.json({ message: 'Lecture created successfully!' });
  } catch (err) {
    console.error('Create lecture error:', err);
    res.status(500).json({ message: 'Failed to create lecture. Please try again.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
