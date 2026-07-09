const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { ZipArchive } = require('archiver');
const fs = require('fs');
const path = require('path');

// Khởi tạo S3 Client (Nó sẽ tự lấy AWS_ACCESS_KEY_ID từ biến môi trường của hệ thống/Docker)
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

// Hàm Core: Chịu trách nhiệm nén và bắn lên S3
const runBackupToS3 = async (triggerBy = 'Manual') => {
    console.log(`[Backup] Bắt đầu quá trình back-up. Kích hoạt bởi: ${triggerBy}`);
    
    // Lấy thời gian chuẩn, format thành: 2026-07-09_22-15-30
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // Đặt tên Key chuẩn với cấu trúc của ông
    // Kết quả sẽ ra: minecraft/backup_2026-07-09_22-15-30/world.zip
    const s3Key = `minecraft/backup_${timestamp}/world.zip`;
    
    const worldPath = path.join(process.env.MC_SERVER_PATH, 'world');

    if (!fs.existsSync(worldPath)) {
        console.error('[Backup] Lỗi: Không tìm thấy thư mục map ở đường dẫn:', worldPath);
        return false;
    }

    try {
        const archive = new ZipArchive({ zlib: { level: 9 } });
        
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.S3_BUCKET_NAME, 
                Key: s3Key,                         
                Body: archive,
            },
        });

        archive.directory(worldPath, 'world');
        archive.finalize();

        await upload.done();
        console.log(`[Backup] Thành công! Đã lưu tại S3: s3://${process.env.S3_BUCKET_NAME}/${s3Key}`);
        return s3Key;

    } catch (error) {
        console.error('[Backup] Lỗi đẩy file lên S3:', error);
        return false;
    }
};

const manualBackup = async (req, res) => {
    res.status(202).json({ message: 'Quá trình back-up đang chạy ngầm...' });
    await runBackupToS3('API Manual');
};

module.exports = {
    runBackupToS3,
    manualBackup
};