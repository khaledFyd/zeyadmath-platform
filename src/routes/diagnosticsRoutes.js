const express = require('express');
const router = express.Router();
const diagnosticsController = require('../controllers/diagnosticsController');

// Public route - no authentication required
// This allows diagnostics to be checked even before login
router.get('/system', diagnosticsController.getSystemDiagnostics);

module.exports = router;