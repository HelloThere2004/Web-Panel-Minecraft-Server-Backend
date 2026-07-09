require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { runBackupToS3 } = require('./controllers/backupCtrl');
const app = express();
const PORT = process.env.PORT || 3000;
const { Rcon } = require('rcon-client');
let crashCounter = 0;

// Middleware
app.use(cors()); // Cho phép Front-end gọi API
app.use(express.json()); // Để đọc được body kiểu JSON

// Import Routes
const serverRoutes = require('./routes/server');
app.use('/api/server', serverRoutes);

cron.schedule('0 3 * * 0', () => {
    console.log('⏰ Chạy lịch back-up map định kỳ hàng tuần...');
    runBackupToS3('Weekly Cronjob');
});

setInterval(async () => {
    try {
        const rcon = await Rcon.connect({
            host: process.env.RCON_HOST,
            port: process.env.RCON_PORT,
            password: process.env.RCON_PASS,
            timeout: 5000 // Chờ 5s thôi, không phản hồi là tính rớt
        });
        await rcon.end();
        crashCounter = 0; // Ping ngon thì reset bộ đếm
    } catch (error) {
        crashCounter++;
        console.log(`[Health Check] Server không phản hồi lần ${crashCounter}...`);
        
        if (crashCounter === 3) {
            console.log('🚨 Phát hiện Server Crash! Kích hoạt Auto-Backup khẩn cấp!');
            runBackupToS3('Server Crash Recovery');
            crashCounter = -9999; // Set âm để nó không bị spam back-up liên tục lúc server đang chết
        }
    }
}, 60000); // 60 giây check 1 lần

// Route Test xem server sống chưa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Back-end Panel đang chạy ngon lành!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Web Panel Back-end đang chạy tại cổng ${PORT}`);
});