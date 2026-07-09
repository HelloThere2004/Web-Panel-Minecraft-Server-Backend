const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

// Logic: Bắn một lệnh bất kỳ vào game (ví dụ: say Hello, gamerule...)
exports.executeCommand = async (req, res) => {
    const { command } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Ông chưa nhập lệnh!' });
    }

    try {
        const rcon = await Rcon.connect({
            host: process.env.RCON_HOST || '127.0.0.1',
            port: process.env.RCON_PORT,
            password: process.env.RCON_PASS
        });

        const response = await rcon.send(command);
        await rcon.end(); // Bắn xong thì đóng kết nối

        res.status(200).json({ success: true, response: response });
    } catch (error) {
        console.error('RCON Error:', error);
        res.status(500).json({ error: 'Không kết nối được với Minecraft Server' });
    }
};

// Logic: Đọc log thời gian thực (Tính năng "Real-time Logging")
exports.getLogs = (req, res) => {
    try {
        const logPath = path.join(process.env.MC_SERVER_PATH, 'logs', 'latest.log');
        
        // Đọc 100 dòng cuối của file log (có thể tối ưu bằng stream sau)
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.trim().split('\n');
        const last100Lines = lines.slice(-100).join('\n');

        res.status(200).json({ success: true, logs: last100Lines });
    } catch (error) {
        console.error('File Error:', error);
        res.status(500).json({ error: 'Không đọc được file log' });
    }
};