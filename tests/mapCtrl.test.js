// Chặn đứng lỗi ESM của thư viện archiver
jest.mock('archiver', () => jest.fn());

// 🚀 BỔ SUNG CỤC NÀY: Giả vờ thư viện AWS sinh link thành công 
jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://fake-s3-link.com/world.zip')
}));

const request = require('supertest');
const app = require('../index'); // File app.js hoặc server.js gốc (chứa cấu hình express của ông)

// ==========================================
// BƯỚC 1: LẬP BÀN THỜ "MOCK" (LÀM GIẢ)
// ==========================================

jest.mock('child_process', () => ({
    exec: jest.fn((cmd, cb) => cb(null, 'ok', '')) 
}));

jest.mock('../controllers/backupCtrl', () => ({
    runBackupToS3: jest.fn().mockResolvedValue('minecraft/backup_fake/world.zip'),
    manualBackup: jest.fn((req, res) => res.status(202).send()) // Bổ sung dòng này để Express không bị crash
}));

// ==========================================
// BƯỚC 2: VIẾT CÁC KỊCH BẢN (TEST CASES)
// ==========================================
describe('Kiểm thử cụm API Quản lý Map', () => {

    // Test Case 1: Kịch bản hoàn hảo
    it('Nên trả về link Pre-signed URL khi gọi API lấy link upload', async () => {
        // Đóng vai ReactJS gọi API
        const response = await request(app).get('/api/server/map/upload-url');
        
        // Kiểm tra xem hệ thống có trả về HTTP 200 không
        expect(response.status).toBe(200);
        
        // Kiểm tra xem dữ liệu trả về có cái link ảo mình đã Mock ở trên không
        expect(response.body.success).toBe(true);
        expect(response.body.uploadUrl).toBe('https://fake-s3-link.com/world.zip');
        expect(response.body.s3Key).toContain('minecraft/uploads/world_');
    });

    // Test Case 2: Kịch bản người dùng táy máy phá hoại
    it('Nên báo lỗi 400 nếu gọi API Deploy mà quên gửi s3Key', async () => {
        // Gửi body rỗng, cố tình không truyền s3Key vào
        const response = await request(app)
            .post('/api/server/map/deploy')
            .send({}); 
            
        // Hệ thống của ông phải bắt được lỗi này và chửi lại (HTTP 400)
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Thiếu S3 Key rồi ông ơi!');
    });

});