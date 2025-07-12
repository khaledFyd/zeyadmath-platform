const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const statusController = require('../controllers/statusController');

// Protected route - requires authentication
router.get('/site', auth, statusController.getSiteStatus);

module.exports = router;