const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Tái sử dụng s3Client từ file backupCtrl của ông
const { s3Client, runBackupToS3 } = require('./backupCtrl'); 

const serverPath = process.env.MC_SERVER_PATH || '/home/ubuntu/minecraft';

// Hàm helper tắt/bật server
const stopServer = async () => {
    console.log('[Map] Đang tắt server an toàn...');
    try {
        await execPromise(`screen -S mc-server -X stuff "stop\r"`);
        await new Promise(resolve => setTimeout(resolve, 15000)); 
    } catch (e) {
        console.log('[Map] Screen không chạy, bỏ qua bước tắt.');
    }
};

const startServer = async () => {
    console.log('[Map] Đang khởi động lại server...');
    await execPromise(`cd ${serverPath} && screen -dmS mc-server java -Xmx4G -Xms4G -jar server.jar nogui`);
};

// ==========================================
// TÍNH NĂNG 1A: SINH LINK PRE-SIGNED URL ĐỂ FRONT-END UPLOAD
// ==========================================
const getUploadUrl = async (req, res) => {
    try {
        const timestamp = Date.now();
        const s3Key = `minecraft/uploads/world_${timestamp}.zip`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            ContentType: 'application/zip'
        });

        // Link có hiệu lực trong 15 phút, bảo mật tuyệt đối
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        res.status(200).json({
            success: true,
            uploadUrl: signedUrl,
            s3Key: s3Key 
        });
    } catch (error) {
        console.error('[Map] Lỗi tạo Pre-signed URL:', error);
        res.status(500).json({ error: 'Không thể tạo link upload S3' });
    }
};

// ==========================================
// TÍNH NĂNG 1B: KÍCH HOẠT DEPLOY (Sau khi Front-end đã up xong lên S3)
// ==========================================
const deployMapFromS3 = async (req, res) => {
    const { s3Key } = req.body; 
    if (!s3Key) return res.status(400).json({ error: 'Thiếu S3 Key rồi ông ơi!' });

    res.status(202).json({ message: 'Đang kéo map từ S3 về để cài đặt ngầm...' });

    try {
        await stopServer();

        const worldPath = path.join(serverPath, 'world');
        const localZipPath = path.join(serverPath, 'downloaded_world.zip');

        // 1. Backup map hiện tại lên S3 phòng hờ sự cố trước khi ghi đè
        if (fs.existsSync(worldPath)) {
            console.log('[Map] Kích hoạt đẩy map cũ lên S3 để lưu trữ...');
            await runBackupToS3('Map Upload Replacement');
            
            console.log('[Map] Đã backup xong. Tiến hành xoá folder map cũ cục bộ...');
            fs.rmSync(worldPath, { recursive: true, force: true });
        }

        // 2. Kéo file map khủng từ S3 về con Oracle Cloud qua AWS CLI tốc độ cao
        console.log(`[Map] Đang kéo file từ S3 về local: ${s3Key}`);
        await execPromise(`aws s3 cp s3://${process.env.S3_BUCKET_NAME}/${s3Key} ${localZipPath}`);

        // 3. Bung nén bằng lệnh hệ điều hành Ubuntu ARM
        console.log('[Map] Đang bung nén map mới...');
        await execPromise(`unzip -o ${localZipPath} -d ${serverPath}`);
        
        // 4. Dọn dẹp file zip tạm ở local và xóa luôn file tạm trên S3 để tránh rác
        fs.unlinkSync(localZipPath);
        try {
            await execPromise(`aws s3 rm s3://${process.env.S3_BUCKET_NAME}/${s3Key}`);
            console.log('[Map] Đã dọn dẹp file upload tạm trên S3.');
        } catch (s3Err) {
            console.log('[Map] Cảnh báo: Không thể xoá file tạm trên S3, quy trình deploy vẫn tiếp tục.', s3Err);
        }

        await startServer();
        console.log('[Map] Quá trình deploy map mới hoàn tất thành công!');

    } catch (error) {
        console.error('[Map] Lỗi nghiêm trọng khi deploy từ S3:', error);
    }
};

// ==========================================
// TÍNH NĂNG 2: TẠO MAP MỚI (Dùng Seed hoặc Auto)
// ==========================================
const generateMap = async (req, res) => {
    const seed = req.body.seed || ''; 

    res.status(202).json({ message: `Đang tiến hành tạo map mới ${seed ? `với seed: ${seed}` : '(Auto Seed)'} ngầm...` });

    try {
        await stopServer();

        const worldPath = path.join(serverPath, 'world');
        
        if (fs.existsSync(worldPath)) {
            console.log('[Map] Kích hoạt đẩy map cũ lên S3 trước khi gen map mới...');
            await runBackupToS3('Map Generation Replacement'); 
            
            console.log('[Map] Đã backup xong. Tiến hành xoá folder map cũ local...');
            fs.rmSync(worldPath, { recursive: true, force: true });
        }

        // Cấu hình file cấu hình game
        const propsPath = path.join(serverPath, 'server.properties');
        if (fs.existsSync(propsPath)) {
            console.log('[Map] Đang ghi đè cấu hình Seed...');
            let propsContent = fs.readFileSync(propsPath, 'utf8');
            propsContent = propsContent.replace(/^level-seed=.*$/m, `level-seed=${seed}`);
            fs.writeFileSync(propsPath, propsContent);
        }

        await startServer();
        console.log('[Map] Đã kích hoạt tiến trình tạo map mới thành công!');

    } catch (error) {
        console.error('[Map] Lỗi khi tạo map mới:', error);
    }
};

module.exports = {
    getUploadUrl,
    deployMapFromS3,
    generateMap
};