const gmailService = require('../services/gmailService');
const geminiAgent = require('../services/geminiAgent');

const SPAM_KEYWORDS_LIST = [ // Renamed to avoid conflict if SPAM_KEYWORDS was used elsewhere, though it wasn't.
  'free', 'cash', 'money', 'earn', 'credit', 'debt', 'loan', 'discount', 'sale',
  'investment', 'million', 'billion', 'bonus', 'prize', 'giveaway', 'hidden',
  'fees', 'act now', 'call now', 'apply now', 'limited time', 'offer expires',
  'hurry', 'urgent', 'immediate', 'don\\\'t miss out', 'final notice', 'last chance', // Escaped apostrophe
  'while supplies last', 'click here', 'click below', 'download now', 'lose weight',
  'miracle cure', 'fat burning', 'viagra', 'xanax', 'cialis', 'all-natural',
  'clinically proven', 'guaranteed', '100%', 'amazing', 'incredible',
  'revolutionary', 'unbelievable', 'life-changing', 'breakthrough', 'no obligation',
  'risk-free', 'verify your account', 'account update', 'confirm identity',
  'password', 'security breach', 'suspicious activity', 'dear friend',
  'dear customer', 'to whom it may concern', 'you have been selected',
  'special invitation', 'multi-level marketing', 'work from home',
  'this isn\\\'t spam', 'not junk' // Escaped apostrophe
];

// Escape special regex characters in keywords and join with |
const escapedKeywords = SPAM_KEYWORDS_LIST.map(keyword =>
  keyword.replace(/[.*+?^${}()|[\]]/g, '\\$&') // $& means the whole matched string
);
const spamKeywordsRegex = new RegExp(escapedKeywords.join('|'), 'i'); // 'i' for case-insensitive

/**
 * Controller to handle Gmail related operations,
 * specifically analyzing emails for spam.
 */
const gmailController = {
  analyzeInboxForSpam: async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'Missing access_token in request body' });
    }

    try {
      console.log('GmailController: Starting inbox analysis for spam (two-stage)...');
      const messagesToFetch = 300;
      const allMessages = await gmailService.getMessageDetails(access_token, messagesToFetch);

      if (!allMessages || allMessages.length === 0) {
        console.log('GmailController: No messages retrieved from Gmail service.');
        return res.json({
          spamMessages: [],
          summary: {
            totalScannedLocally: 0,
            totalSuspectedByLocalFilter: 0,
            totalConfirmedSpamByAI: 0,
            message: 'No messages found to analyze.'
          }
        });
      }

      console.log(\`GmailController: Retrieved \${allMessages.length} messages. Starting local pre-filtering...\`);

      const suspectedSpamEmails = [];
      for (const message of allMessages) {
        const subject = message.subject || '';
        const snippet = message.snippet || '';
        // Test regex against concatenated subject and snippet.
        // No need to toLowerCase() here because regex has 'i' flag.
        if (spamKeywordsRegex.test(subject + ' ' + snippet)) {
          suspectedSpamEmails.push(message);
        }
      }

      console.log(\`GmailController: Local pre-filtering complete. \${suspectedSpamEmails.length} emails suspected as spam. Analyzing with Gemini (1.5 Flash)...\`);

      const aiAnalyzedResults = [];
      if (suspectedSpamEmails.length > 0) {
        for (const suspectedEmail of suspectedSpamEmails) {
          const analysis = await geminiAgent.analyzeEmailContent(suspectedEmail.subject, suspectedEmail.snippet);
          aiAnalyzedResults.push({
            messageId: suspectedEmail.id, // Ensure original message ID is used
            threadId: suspectedEmail.threadId,
            from: suspectedEmail.from,
            subject: suspectedEmail.subject,
            snippet: suspectedEmail.snippet,
            aiAnalysis: analysis,
          });
        }
      }

      const confirmedSpamMessages = aiAnalyzedResults.filter(result => result.aiAnalysis.isSpam);

      console.log(\`GmailController: Gemini analysis complete. Found \${confirmedSpamMessages.length} confirmed spam messages out of \${suspectedSpamEmails.length} suspects.\`);

      res.json({
        spamMessages: confirmedSpamMessages,
        // otherMessages could be allMessages minus confirmedSpamMessages, or aiAnalyzedResults minus confirmedSpamMessages.
        // For now, let's just send confirmed spam.
        summary: {
          totalScannedLocally: allMessages.length,
          totalSuspectedByLocalFilter: suspectedSpamEmails.length,
          totalConfirmedSpamByAI: confirmedSpamMessages.length,
        }
      });

    } catch (error) {
      console.error('GmailController: Error analyzing inbox for spam:', error.message, error.stack);
      if (error.message.includes("invalid_grant") || error.message.includes("Token has been expired or revoked")) {
        return res.status(401).json({ error: 'Authentication error with Google. Please re-authenticate.', details: error.message });
      }
      res.status(500).json({ error: 'Failed to analyze inbox for spam.', details: error.message });
    }
  }
};

module.exports = gmailController;
