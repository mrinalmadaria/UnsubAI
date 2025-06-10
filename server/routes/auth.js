const express = require("express");
const oauth2Client = require("../config/googleConfig");
const router = express.Router();

// Debug endpoint to check configuration
router.get("/debug", (req, res) => {
  res.json({
    CLIENT_ID_SET: !!process.env.CLIENT_ID,
    CLIENT_ID_PREFIX: process.env.CLIENT_ID?.substring(0, 20),
    CLIENT_SECRET_SET: !!process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI,
    NODE_ENV: process.env.NODE_ENV,
    CURRENT_TIME: new Date().toISOString()
  });
});

router.get("/google", (req, res) => {
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly"
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",  
    include_granted_scopes: true
    // Remove explicit redirect_uri here - let it use the one from config
  });
  
  console.log("=== AUTH URL GENERATION ===");
  console.log("Generated URL:", url);
  console.log("Redirect URI in use:", process.env.REDIRECT_URI);
  console.log("Time:", new Date().toISOString());
  
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  console.log("=== CALLBACK RECEIVED ===");
  console.log("Full query params:", req.query);
  console.log("Headers:", req.headers);
  console.log("Time:", new Date().toISOString());
  
  const { code, error, state } = req.query;
  
  if (error) {
    console.log("OAuth error received:", error);
    return res.status(400).send(`OAuth error: ${error}`);
  }
  
  if (!code) {
    console.log("No authorization code received");
    return res.status(400).send("Missing code parameter");
  }
  
  console.log("Authorization code received (length):", code.length);
  
  try {
    console.log("=== ATTEMPTING TOKEN EXCHANGE ===");
    
    // Don't pass redirect_uri explicitly - let the client use its configured one
    // const { tokens } = await oauth2Client.getToken(code);
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.REDIRECT_URI
    });
    
    console.log("=== TOKEN EXCHANGE SUCCESS ===");
    console.log("Received tokens:", Object.keys(tokens));
    
    oauth2Client.setCredentials(tokens);
    
    res.send(`
      <html>
        <body>
          <script>
            console.log("Posting message to parent window");
            window.opener.postMessage(
              { access_token: "${tokens.access_token}" },
              "http://localhost:5173"
            );
            setTimeout(() => window.close(), 1000);
          </script>
          <h2>Authentication Successful!</h2>
          <p>You may close this window.</p>
          <p>Access token: ${tokens.access_token?.substring(0, 20)}...</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("=== TOKEN EXCHANGE ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error status:", err.status);
    console.error("Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    
    // Try to get more details from the error response
    if (err.response && err.response.data) {
      console.error("Response data:", err.response.data);
    }
    
    res.status(500).send(`
      <h2>Token Exchange Failed</h2>
      <p><strong>Error:</strong> ${err.message}</p>
      <p><strong>Code:</strong> ${code?.substring(0, 50)}...</p>
      <p><strong>Redirect URI:</strong> ${process.env.REDIRECT_URI}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <pre>${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}</pre>
    `);
  }
});

module.exports = router;