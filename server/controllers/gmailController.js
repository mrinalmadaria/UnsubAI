const gmailService = require('../services/gmailService');
const openaiAgent = require('../services/openaiAgent');

/**
 * Controller to handle Gmail related operations,
 * specifically analyzing emails for spam.
 */
const gmailController = {
  /**
   * Analyzes recent emails for spam using OpenAI and returns a list of
   * messages identified as spam, along with AI reasoning and potential unsubscribe links.
   * Expects { access_token: "user_access_token" } in the request body.
   */
  analyzeInboxForSpam: async (req, res) => {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Missing access_token in request body' });
    }

    try {
      console.log('GmailController: Starting inbox analysis for spam...');
      // Fetch latest messages with details
      // Let's fetch a small number for now, e.g., 10-15. This can be configurable later.
      const messages = await gmailService.getMessageDetails(access_token, 15);

      if (!messages || messages.length === 0) {
        console.log('GmailController: No messages retrieved from Gmail service.');
        return res.json({ spamMessages: [], otherMessages: [], message: 'No messages found to analyze.' });
      }

      console.log(`GmailController: Retrieved ${messages.length} messages. Analyzing with OpenAI...`);

      const analysisResults = [];
      for (const message of messages) {
        // Provide subject and snippet for analysis.
        // The OpenAI prompt is designed to handle cases where subject or snippet might be short or missing.
        const analysis = await openaiAgent.analyzeEmailContent(message.subject, message.snippet);
        analysisResults.push({
          messageId: message.id,
          threadId: message.threadId,
          from: message.from,
          subject: message.subject,
          snippet: message.snippet,
          aiAnalysis: analysis, // Contains isSpam, reason, hasUnsubscribeLink, identifiedLink
        });
      }

      const spamMessages = analysisResults.filter(result => result.aiAnalysis.isSpam);
      const otherMessages = analysisResults.filter(result => !result.aiAnalysis.isSpam);

      console.log(`GmailController: Analysis complete. Found ${spamMessages.length} spam messages.`);

      res.json({
        spamMessages: spamMessages,
        otherMessages: otherMessages, // Optionally return non-spam too, for context or UI
        summary: {
          totalAnalyzed: messages.length,
          spamCount: spamMessages.length,
        }
      });

    } catch (error) {
      console.error('GmailController: Error analyzing inbox for spam:', error.message);
      if (error.message.includes("invalid_grant") || error.message.includes("Token has been expired or revoked")) {
        return res.status(401).json({ error: 'Authentication error with Google. Please re-authenticate.', details: error.message });
      }
      res.status(500).json({ error: 'Failed to analyze inbox for spam.', details: error.message });
    }
  }
};

module.exports = gmailController;
