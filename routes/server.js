const express = require('express');
const router = express.Router();
const serverCtrl = require('../controllers/serverCtrl');

// POST /api/server/command
router.post('/command', serverCtrl.executeCommand);

// GET /api/server/logs
router.get('/logs', serverCtrl.getLogs);

module.exports = router;