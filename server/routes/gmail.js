const express = require("express");
const router = express.Router();
const gmailController = require('../controllers/gmailController');

// POST /gmail/analyze - Analyzes inbox for spam
// The client calls "/gmail/analyze", so this route definition assumes
// this router file is mounted at the root or a path that makes this valid.
// For example, if in server/index.js it's app.use('/gmail', gmailRoutes);
router.post("/analyze", gmailController.analyzeInboxForSpam);

// Future: Add a route for unsubscribing if that functionality is built out.
// Example: router.post("/unsubscribe", gmailController.handleUnsubscribe);

module.exports = router;