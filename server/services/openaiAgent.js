const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function analyzeSenders(senders) {
  const prompt = `These are email senders from my inbox:\n${senders.join('\n')}\nWhich of these look like mailing lists or subscriptions? Reply with a JSON array of the ones to consider unsubscribing from.`;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });
  // Parse the model's response as JSON
  try {
    const text = response.data.choices[0].message.content;
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
}

module.exports = { analyzeSenders };