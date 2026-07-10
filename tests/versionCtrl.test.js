jest.mock('archiver', () => jest.fn());
jest.mock('../controllers/backupCtrl', () => ({
    runBackupToS3: jest.fn().mockResolvedValue(true),
    manualBackup: jest.fn((req, res) => res.status(202).send()) // Bổ sung dòng này
}));

const request = require('supertest');
const app = require('../index'); // Trỏ đến file cấu hình Express app của ông

// Giả lập hàm fetch toàn cục của Node.js
global.fetch = jest.fn();

describe('Kiểm thử Version Controller', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Dọn dẹp mock sau mỗi kịch bản
    });

    it('Nên trả về danh sách phiên bản (chỉ lấy bản release) thành công', async () => {
        // Làm giả dữ liệu Mojang trả về
        const mockMojangData = {
            latest: { release: "1.20.4" },
            versions: [
                { id: "1.20.4", type: "release", url: "http://link1", releaseTime: "2023-12-07" },
                { id: "1.20.5-snapshot", type: "snapshot", url: "http://link2", releaseTime: "2023-12-08" },
                { id: "1.20.3", type: "release", url: "http://link3", releaseTime: "2023-10-01" }
            ]
        };

        // Ép hàm fetch trả về dữ liệu ảo
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMojangData
        });

        const response = await request(app).get('/api/server/versions');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.latest).toBe("1.20.4");
        
        // Logic của ông phải lọc bỏ bản 'snapshot', nên kết quả chỉ còn 2 bản
        expect(response.body.versions.length).toBe(2);
        expect(response.body.versions[0].version).toBe("1.20.4");
    });

    it('Nên báo lỗi 500 nếu máy chủ Mojang sập', async () => {
        // Giả lập lỗi mạng
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const response = await request(app).get('/api/server/versions');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });
});