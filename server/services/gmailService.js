const { google } = require("googleapis");

// oauth2Client should be required from googleConfig if you need to initialize it here
// or ensure it's passed appropriately if this service is instantiated.
// For now, assuming access_token is passed directly as in listSenders.

async function listSenders(access_token) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });

  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20, // Let's keep this configurable or higher for real use
  });

  const messages = res.data.messages || [];
  const senders = [];

  for (let msg of messages) {
    const msgDetail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: 'metadata', // Only get headers if we only need sender
      metadataHeaders: ['From']
    });

    const fromHeader = msgDetail.data.payload.headers.find(h => h.name === "From");
    senders.push(fromHeader?.value || "Unknown Sender");
  }
  return senders;
}

/**
 * Fetches a list of messages with their details (id, subject, snippet, from).
 * @param {string} access_token The Google OAuth2 access token.
 * @param {number} maxResults Maximum number of messages to fetch.
 * @returns {Promise<Array<Object>>} A list of message objects.
 */
async function getMessageDetails(access_token, maxResults = 10) { // Default to 10 messages for analysis
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });
  const gmail = google.gmail({ version: "v1", auth });

  console.log(`GmailService: Fetching up to ${maxResults} messages.`);

  try {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: maxResults,
      // Consider adding q: "is:unread" or other filters if needed
    });

    const messages = listResponse.data.messages || [];
    if (messages.length === 0) {
      console.log("GmailService: No messages found.");
      return [];
    }

    const detailedMessages = [];
    for (const message of messages) {
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "METADATA", // Fetch metadata (headers) and snippet
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = msgDetail.data.payload.headers;
        const subjectHeader = headers.find(h => h.name === "Subject");
        const fromHeader = headers.find(h => h.name === "From");

        detailedMessages.push({
          id: msgDetail.data.id,
          threadId: msgDetail.data.threadId,
          snippet: msgDetail.data.snippet, // Snippet is a short part of the message text
          subject: subjectHeader ? subjectHeader.value : "No Subject",
          from: fromHeader ? fromHeader.value : "Unknown Sender",
          // We are not fetching the full body here to save on data and processing
          // The snippet should be enough for the OpenAI agent's initial analysis.
        });
      } catch (err) {
        console.error(`GmailService: Error fetching details for message ID ${message.id}:`, err.message);
        // Skip this message and continue with others
      }
    }
    console.log(`GmailService: Successfully fetched details for ${detailedMessages.length} messages.`);
    return detailedMessages;
  } catch (error) {
    console.error("GmailService: Error listing messages:", error.message);
    throw error; // Re-throw to be handled by the controller
  }
}

module.exports = { listSenders, getMessageDetails };