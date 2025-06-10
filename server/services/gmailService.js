const { google } = require("googleapis");

async function listSenders(access_token) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });

  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
  });

  const messages = res.data.messages || [];
  const senders = [];

  for (let msg of messages) {
    const msgDetail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const fromHeader = msgDetail.data.payload.headers.find(h => h.name === "From");
    senders.push(fromHeader?.value || "Unknown");
  }

  return senders;
}

module.exports = { listSenders };