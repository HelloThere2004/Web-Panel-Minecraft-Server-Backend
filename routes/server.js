const express = require('express');
const router = express.Router();
const serverCtrl = require('../controllers/serverCtrl');
const backupCtrl = require('../controllers/backupCtrl');
const { getMinecraftVersions } = require('../controllers/versionCtrl');
const { updateMinecraftServer } = require('../controllers/updateCtrl');
const { getUploadUrl, deployMapFromS3, generateMap } = require('../controllers/mapCtrl');

// POST /api/server/command
router.post('/command', serverCtrl.executeCommand);

// GET /api/server/logs
router.get('/logs', serverCtrl.getLogs);

//POST /api/server/backup
router.post('/backup', backupCtrl.manualBackup);

// GET /api/server/versions
router.get('/versions', getMinecraftVersions);

// POST /api/server/update
router.post('/update', updateMinecraftServer);

// ==========================================
router.get('/map/upload-url', getUploadUrl);       // Bước 1: Lấy link để React upload trực tiếp lên S3
router.post('/map/deploy', deployMapFromS3);       // Bước 2: Kích hoạt kéo file từ S3 về Ubuntu cài đặt

// POST /api/map/generate
router.post('/map/generate', generateMap);         // Tính năng phụ: Gen map bằng Seed
module.exports = router;