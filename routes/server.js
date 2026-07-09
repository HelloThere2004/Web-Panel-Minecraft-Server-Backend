const express = require('express');
const router = express.Router();
const serverCtrl = require('../controllers/serverCtrl');
const backupCtrl = require('../controllers/backupCtrl');

// POST /api/server/command
router.post('/command', serverCtrl.executeCommand);

// GET /api/server/logs
router.get('/logs', serverCtrl.getLogs);

//POST /api/server/backup
router.post('/backup', backupCtrl.manualBackup);

module.exports = router;