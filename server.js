require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(cors());
app.use(express.json());

// Database setup
const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'sqlite',
  storage: './database.sqlite'
});

// Define Employee model
const Employee = sequelize.define('Employee', {
  name: DataTypes.STRING,
  employeeId: DataTypes.STRING,
  date: DataTypes.DATE,
  startTime: DataTypes.STRING,
  confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  timestamp: DataTypes.DATE,
  note: DataTypes.STRING
});

// Define ExcelData model for historical uploads
const ExcelData = sequelize.define('ExcelData', {
  date: DataTypes.DATE,
  filename: DataTypes.STRING,
  uploadDate: DataTypes.DATE
});

// Initialize database
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('SQLite database connected and force-synced');
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// API Endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Process and save to SQLite
    // Find start time column (contains date in header)
    // Find start time column (contains date in header)
    const startTimeCol = Object.keys(data[0]).find(key => 
      key.match(/[A-Za-z]{3},? [A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4}/)
    );
    
    if (!startTimeCol) {
      console.error('Available columns:', Object.keys(data[0]));
      throw new Error('Could not find start time column with date header');
    }
    console.log('Found start time column:', startTimeCol);

    // Parse Excel header date (could be "Sun, July 14th, 2025" or other formats)
    let utcDate;
    try {
      const dateMatch = startTimeCol.match(/([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
      if (!dateMatch) throw new Error('Invalid date format in Excel header');
      
      const monthName = dateMatch[2];
      const day = parseInt(dateMatch[3]);
      const year = parseInt(dateMatch[4]);
      
      const month = new Date(`${monthName} 1, ${year}`).getMonth();
      if (isNaN(month)) throw new Error('Invalid month name');
      
      utcDate = new Date(Date.UTC(year, month, day));
      if (isNaN(utcDate.getTime())) throw new Error('Invalid date');
      
      console.log(`Parsed Excel date: ${utcDate.toISOString()}`);
    } catch (err) {
      console.error('Error parsing Excel date:', err.message);
      throw new Error(`Could not parse date from Excel header: ${startTimeCol}`);
    }
    
    const employees = await Promise.all(data.map(row => {
      if (!row['Full Name'] || !row['ID'] || !row[startTimeCol]) {
        throw new Error('Excel file must contain "Full Name", "ID" and start time columns');
      }
      let startTime = row[startTimeCol];
      // Convert Excel decimal time to HH:MM AM/PM if it's a number
      if (typeof startTime === 'number') {
        const hours = Math.floor(startTime * 24);
        const minutes = Math.floor((startTime * 24 - hours) * 60);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        startTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else {
        startTime = startTime.toString().trim();
      }

      return Employee.create({
        name: row['Full Name'].toString().trim(),
        employeeId: row['ID'].toString().trim(),
        startTime: startTime,
        date: utcDate
      });
    }));

    // Store original Excel data
    const excelData = {
      date: utcDate,
      filename: req.file.filename,
      uploadDate: new Date()
    };
    const createdData = await ExcelData.create(excelData);
    console.log(`Stored Excel data with date: ${createdData.date.toISOString()}`);
    
    // Log first employee's stored date
    if (employees.length > 0) {
      const firstEmployee = await Employee.findByPk(employees[0].id);
      console.log(`First employee stored date: ${firstEmployee.date.toISOString()}`);
    }

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    // Move the uploaded file
    fs.renameSync(req.file.path, `uploads/${req.file.filename}`);
    
    res.status(200).json({ 
        message: 'File processed successfully', 
        count: employees.length,
        date: utcDate.toISOString() 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/employees/:date', async (req, res) => {
  try {
    console.log(`Fetching employees for date: ${req.params.date}`);
    // Parse date in UTC to avoid timezone issues
    const dateStr = req.params.date;
    const queryDate = new Date(`${dateStr}T00:00:00Z`);
    console.log(`Parsed UTC date: ${queryDate.toISOString()}`);
    
    // Find all employees where date matches (ignoring time components)
    const employees = await Employee.findAll({
      where: sequelize.where(
        sequelize.fn('date', sequelize.col('date')),
        queryDate.toISOString().split('T')[0]
      )
    });
    
    console.log(`Found ${employees.length} employees`);
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all historical upload dates
app.get('/api/uploads', async (req, res) => {
  try {
    const uploads = await ExcelData.findAll({
      order: [['date', 'DESC']]
    });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/confirm', async (req, res) => {
  try {
    const { employeeId, note } = req.body;
    await Employee.update(
      { confirmed: true, timestamp: new Date(), note },
      { where: { employeeId } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
