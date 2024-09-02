const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

const app = express();
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Attendence_System",
  password: "gOOgly12345",
  port: 5432,
});

db.connect();

// Function to get the local IP address
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ipAddress = getIPAddress();

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM teacher WHERE email_id = $1 AND password = $2', [email, password]);

    if (result.rows.length > 0) {
      // Login successful, redirect to lec.html
      res.json({ success: true });
    } else {
      // Invalid credentials
      res.status(401).json({ success: false, message: 'Wrong credentials, please try again.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Create lecture route
app.post('/api/create-lecture', async (req, res) => {
  const { topic, division, date, time } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO lecture (teacher_id, topic, division, date, time, qrcode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING lecture_id',
      [1, topic, division, date, time, 'generated_qr_code']  // Assuming teacher_id = 1 for simplicity
    );

    const lecture_id = result.rows[0].lecture_id;
    const column_name_status = `status${lecture_id}`;
    const column_name_attendance = `atten${lecture_id}`;

    await db.query(`ALTER TABLE student ADD COLUMN ${column_name_status} INT DEFAULT 0`);
    await db.query(`ALTER TABLE student ADD COLUMN ${column_name_attendance} INT DEFAULT 0`);
    await db.query(`UPDATE student SET ${column_name_status} = 1 WHERE division = $1`, [division]);

    res.json({ lecture_id, message: 'Lecture created successfully!' });
  } catch (err) {
    console.error('Create lecture error:', err);
    res.status(500).json({ message: 'Failed to create lecture. Please try again.' });
  }
});

// QR code generation route
app.get('/api/qrcode/:lecture_id', (req, res) => {
  const lectureId = req.params.lecture_id;
  const qrCodeData = `http://${ipAddress}:3000/api/attendance/${lectureId}`;

  QRCode.toDataURL(qrCodeData, (err, url) => {
    if (err) {
      console.error('QR Code generation error:', err);
      return res.status(500).json({ message: 'Failed to generate QR code.' });
    }
    res.json({ qrCodeUrl: url });
  });
});

// Mark attendance route
app.get('/api/attendance/:lecture_id', (req, res) => {
  const lectureId = req.params.lecture_id;
  res.sendFile(path.join(__dirname, 'public', 'markAttendance.html'));
});

app.post('/api/mark-attendance', async (req, res) => {
  const { rollNo, lectureId } = req.body;

  try {
    const studentResult = await db.query('SELECT * FROM student WHERE roll_no = $1', [rollNo]);
    const lectureResult = await db.query('SELECT * FROM lecture WHERE lecture_id = $1', [lectureId]);

    if (studentResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid roll number.' });
    }

    if (lectureResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid lecture ID.' });
    }

    const studentDivision = studentResult.rows[0].division;
    const lectureDivision = lectureResult.rows[0].division;

    if (studentDivision === lectureDivision) {
      const attendanceColumn = `atten${lectureId}`;
      await db.query(`UPDATE student SET ${attendanceColumn} = 1 WHERE roll_no = $1`, [rollNo]);
      res.json({ success: true, message: 'Attendance marked successfully!' });
    } else {
      res.status(400).json({ success: false, message: 'Student does not belong to the lecture division.' });
    }
  } catch (err) {
    console.error('Attendance marking error:', err);  
    res.status(500).json({ success: false, message: 'Failed to mark attendance. Please try again.' });
  }
}); 
    
// Handle all other routes by serving the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// const express = require('express');
// const bodyParser = require('body-parser');
// const pg = require('pg');
// const path = require('path');
// const QRCode = require('qrcode');
// const os = require('os');

// const app = express();
// app.use(bodyParser.json());

// // Serve static files from the "public" directory
// app.use(express.static(path.join(__dirname, 'public')));

// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "Attendence_System",
//   password: "gOOgly12345",
//   port: 5432,
// });

// db.connect();

// // Function to get the local IP address
// function getIPAddress() {
//   const interfaces = os.networkInterfaces();
//   for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name]) {
//       if (iface.family === 'IPv4' && !iface.internal) {
//         return iface.address;
//       }
//     }
//   }
//   return '127.0.0.1';
// }

// const ipAddress = getIPAddress();
// // Login route
// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const result = await db.query('SELECT * FROM teacher WHERE email_id = $1 AND password = $2', [email, password]);

//     if (result.rows.length > 0) {
//       // Login successful, redirect to lec.html
//       res.json({ success: true });
//     } else {
//       // Invalid credentials
//       res.status(401).json({ success: false, message: 'Wrong credentials, please try again.' });
//     }
//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).json({ success: false, message: 'Internal server error.' });
//   }
// });

// // Create lecture route
// app.post('/api/create-lecture', async (req, res) => {
//   const { topic, division, date, time } = req.body;
  
//   try {
//     const result = await db.query(
//       'INSERT INTO lecture (teacher_id, topic, division, date, time, qrcode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING lecture_id',
//       [1, topic, division, date, time, 'generated_qr_code']  // Assuming teacher_id = 1 for simplicity
//     );

//     const lecture_id = result.rows[0].lecture_id;
//     const column_name_status = `status${lecture_id}`;
//     const column_name_attendance = `atten${lecture_id}`;

//     await db.query(`ALTER TABLE student ADD COLUMN ${column_name_status} INT DEFAULT 0`);
//     await db.query(`ALTER TABLE student ADD COLUMN ${column_name_attendance} INT DEFAULT 0`);
//     await db.query(`UPDATE student SET ${column_name_status} = 1 WHERE division = $1`, [division]);

//     res.json({ lecture_id, message: 'Lecture created successfully!' });
//   } catch (err) {
//     console.error('Create lecture error:', err);
//     res.status(500).json({ message: 'Failed to create lecture. Please try again.' });
//   }
// });

// // QR code generation route
// app.get('/api/qrcode/:lecture_id', (req, res) => {
//   const lectureId = req.params.lecture_id;
//   const qrCodeData = `http://${ipAddress}:3000/api/attendance/${lectureId}`;

//   QRCode.toDataURL(qrCodeData, (err, url) => {
//     if (err) {
//       console.error('QR Code generation error:', err);
//       return res.status(500).json({ message: 'Failed to generate QR code.' });
//     }
//     res.json({ qrCodeUrl: url });
//   });
// });

// // Handle all other routes by serving the frontend
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });



