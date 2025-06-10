const express = require("express");
const { listSenders } = require("../services/gmailService");
const router = express.Router();

router.post("/fetch", async (req, res, next) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: "Missing access_token in request body" });
  }
  try {
    const senders = await listSenders(access_token);
    res.json({ senders });
  } catch (err) {
    next(err); // Let the global error handler deal with it
  }
});

module.exports = router;