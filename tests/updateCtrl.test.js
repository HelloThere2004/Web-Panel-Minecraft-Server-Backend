jest.mock('archiver', () => jest.fn());
jest.mock('../controllers/backupCtrl', () => ({
    runBackupToS3: jest.fn().mockResolvedValue(true),
    manualBackup: jest.fn((req, res) => res.status(202).send()) // Bổ sung dòng này
}));

const request = require('supertest');
const app = require('../index');

// ==========================================
// MOCK TẤT CẢ CÁC HÀM NGUY HIỂM
// ==========================================
jest.mock('child_process', () => ({
    exec: jest.fn((cmd, cb) => cb(null, 'ok', ''))
}));

jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    unlinkSync: jest.fn(),
    renameSync: jest.fn(),
    createWriteStream: jest.fn()
}));

jest.mock('stream/promises', () => ({
    pipeline: jest.fn().mockResolvedValue() // Giả vờ stream file thành công
}));

// Mock fetch để chặn bước tải manifest và file jar
global.fetch = jest.fn();

describe('Kiểm thử Update Controller', () => {
    it('Nên trả về 400 nếu quên gửi version cần update', async () => {
        const response = await request(app)
            .post('/api/server/update')
            .send({}); // Cố tình gửi body rỗng

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Ông chưa gửi phiên bản (version) lên kìa!');
    });

    it('Nên trả về 202 Accepted và tiến hành chạy ngầm nếu đúng version', async () => {
        // Giả lập dữ liệu Mojang để code của ông không bị văng lỗi đoạn tìm link
        const mockManifest = {
            versions: [{ id: "1.20.4", url: "http://fake-detail-url.com" }]
        };
        const mockDetail = {
            downloads: { server: { url: "http://fake-jar-url.com/server.jar" } }
        };

        // Lần gọi fetch 1 (lấy manifest), Lần 2 (lấy detail url), Lần 3 (tải file jar)
        fetch.mockResolvedValueOnce({ ok: true, json: async () => mockManifest })
             .mockResolvedValueOnce({ ok: true, json: async () => mockDetail })
             .mockResolvedValueOnce({ ok: true, body: 'fake-stream' });

        const response = await request(app)
            .post('/api/server/update')
            .send({ version: '1.20.4' });

        // Chỉ cần thấy API phản hồi 202 là xác nhận hệ thống đã nhận lệnh thành công
        expect(response.status).toBe(202);
        expect(response.body.message).toContain('Đang tiến hành update ngầm lên bản 1.20.4');
    });
});