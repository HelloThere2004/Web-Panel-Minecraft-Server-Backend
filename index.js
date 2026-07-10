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
app.use(cors()); 
app.use(express.json()); 

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
            timeout: 5000 
        });
        await rcon.end();
        crashCounter = 0; 
    } catch (error) {
        crashCounter++;
        console.log(`[Health Check] Server không phản hồi lần ${crashCounter}...`);
        
        if (crashCounter === 3) {
            console.log('🚨 Phát hiện Server Crash! Kích hoạt Auto-Backup khẩn cấp!');
            runBackupToS3('Server Crash Recovery');
            crashCounter = -9999; 
        }
    }
}, 60000); 

// Route Test xem server sống chưa
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Back-end Panel đang chạy ngon lành!' });
});

// ==========================================
// CẬP NHẬT CHO CI/CD TEST
// ==========================================
// Chỉ chạy server lắng nghe port nếu KHÔNG PHẢI đang trong môi trường test
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Web Panel Back-end đang chạy tại cổng ${PORT}`);
    });
}

// Bắt buộc phải export app ra để thư viện supertest nó nạp vào bộ nhớ ảo
module.exports = app;