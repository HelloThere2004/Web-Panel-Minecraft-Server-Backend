const { exec } = require('child_process');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const updateMinecraftServer = async (req, res) => {
    const { version } = req.body; 
    
    if (!version) {
        return res.status(400).json({ error: 'Ông chưa gửi phiên bản (version) lên kìa!' });
    }

    // Phản hồi 202 để Front-end không bị đơ giao diện
    res.status(202).json({ message: `Đang tiến hành update ngầm lên bản ${version}...` });

    try {
        console.log(`[Update] Bắt đầu quá trình nâng cấp lên bản ${version}...`);

        // Bước 1: Tìm link tải từ Manifest
        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
        const manifest = await manifestRes.json();
        
        const versionInfo = manifest.versions.find(v => v.id === version);
        if (!versionInfo) throw new Error('Không tìm thấy phiên bản này!');

        const detailRes = await fetch(versionInfo.url);
        const detail = await detailRes.json();
        const serverJarUrl = detail.downloads.server.url;

        // Cấu hình đường dẫn trên Oracle Cloud ARM
        const serverPath = process.env.MC_SERVER_PATH || '/home/ubuntu/minecraft';
        const tempJarPath = path.join(serverPath, 'server_temp.jar');
        const finalJarPath = path.join(serverPath, 'server.jar');

        // Bước 2: Tải file server.jar mới về làm file tạm
        console.log(`[Update] Đang tải file server.jar từ Mojang...`);
        const jarRes = await fetch(serverJarUrl);
        if (!jarRes.ok) throw new Error('Lỗi khi tải file từ Mojang');
        
        await pipeline(jarRes.body, fs.createWriteStream(tempJarPath));
        console.log('[Update] Đã tải xong file lõi tạm thời.');

        // Bước 3: Tắt server đang chạy trong screen an toàn
        console.log('[Update] Đang gửi lệnh stop vào screen...');
        try {
            await execPromise(`screen -S mc-server -X stuff "stop\r"`);
            console.log('[Update] Chờ 15 giây để server lưu dữ liệu và đóng hẳn...');
            await new Promise(resolve => setTimeout(resolve, 15000));
        } catch (e) {
            console.log('[Update] Screen không hoạt động, bỏ qua bước tắt.');
        }

        // Bước 4: Tráo file jar (Giữ nguyên vẹn eula.txt, server.properties, world)
        console.log('[Update] Tiến hành tráo đổi file jar...');
        if (fs.existsSync(finalJarPath)) {
            fs.unlinkSync(finalJarPath);
        }
        fs.renameSync(tempJarPath, finalJarPath);

        // Bước 5: Khởi chạy lại bằng screen trên nền Oracle ARM
        console.log('[Update] Khởi động lại server trong screen mới...');
        await execPromise(`cd ${serverPath} && screen -dmS mc-server java -Xmx4G -Xms4G -jar server.jar nogui`);
        
        console.log(`[Update] Đã cập nhật thành công lên phiên bản ${version}.`);

    } catch (error) {
        console.error('[Update] Gặp sự cố trong quá trình update:', error);
    }
};

module.exports = {
    updateMinecraftServer
};