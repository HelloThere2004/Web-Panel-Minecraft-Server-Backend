require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Cho phép Front-end gọi API
app.use(express.json()); // Để đọc được body kiểu JSON

// Import Routes
const serverRoutes = require('./routes/server');
app.use('/api/server', serverRoutes);

// Route Test xem server sống chưa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Back-end Panel đang chạy ngon lành!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Web Panel Back-end đang chạy tại cổng ${PORT}`);
});