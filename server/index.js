// Environment variable check
const requiredEnvVars = ['CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI', 'GOOGLE_PROJECT_ID', 'GOOGLE_REGION', 'GOOGLE_APPLICATION_CREDENTIALS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1); // Exit the process with an error code
}
console.log('All required environment variables are set.');
// Add a check for OPENAI_API_KEY as it will be needed for openaiAgent.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const gmailRoutes = require("./routes/gmail");

["CLIENT_ID", "CLIENT_SECRET", "REDIRECT_URI"].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
});

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/gmail", gmailRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));