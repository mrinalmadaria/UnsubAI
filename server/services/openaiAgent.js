const OpenAI = require('openai');

// Ensure OPENAI_API_KEY is loaded (already checked in server/index.js)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes email content to determine if it's spam and tries to find an unsubscribe link.
 * @param {string} subject The subject of the email.
 * @param {string} bodySnippet A snippet of the email body.
 * @returns {Promise<Object>} An object like { isSpam: boolean, reason: string, hasUnsubscribeLink: boolean, identifiedLink: string | null }
 */
async function analyzeEmailContent(subject, bodySnippet) {
  if (!subject && !bodySnippet) {
    console.warn('OpenAI Agent: Subject and body snippet are empty. Cannot analyze.');
    return {
      isSpam: false,
      reason: 'No content provided to analyze.',
      hasUnsubscribeLink: false,
      identifiedLink: null,
    };
  }

  const prompt = `
    Analyze the following email content to determine if it is spam and if it contains an unsubscribe link.
    Provide your response as a JSON object with the following keys: "isSpam" (boolean), "reason" (a brief explanation for the spam classification), "hasUnsubscribeLink" (boolean), and "identifiedLink" (the URL of the unsubscribe link if found, otherwise null).

    Email Subject: "${subject}"
    Email Body Snippet: "${bodySnippet}"

    JSON Response:
  `;

  try {
    console.log('OpenAI Agent: Sending request to OpenAI for email analysis...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more deterministic output
      max_tokens: 150,
      response_format: { type: "json_object" }, // If using a model version that supports JSON mode
    });

    const responseContent = completion.choices[0]?.message?.content;
    console.log('OpenAI Agent: Raw response from OpenAI:', responseContent);

    if (!responseContent) {
      throw new Error('Empty response content from OpenAI.');
    }

    // Attempt to parse the JSON response from the model
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(responseContent.trim());
    } catch (parseError) {
        console.error('OpenAI Agent: Failed to parse JSON response from OpenAI:', responseContent, parseError);
        // Fallback: Try to infer from text if JSON parsing fails (very basic)
        const lowerResponse = responseContent.toLowerCase();
        return {
            isSpam: lowerResponse.includes('"isspam": true') || lowerResponse.includes('spam: yes'),
            reason: 'Could not parse AI response, basic inference attempted.',
            hasUnsubscribeLink: lowerResponse.includes('"hasunsubscribelink": true') || lowerResponse.includes('unsubscribe link: yes'),
            identifiedLink: null, // Too complex to reliably parse link without proper JSON
        };
    }

    // Validate the parsed response structure
    if (typeof parsedResponse.isSpam !== 'boolean' || typeof parsedResponse.reason !== 'string') {
        console.error('OpenAI Agent: Invalid structure in parsed JSON response:', parsedResponse);
        throw new Error('Invalid structure in parsed JSON response from OpenAI.');
    }

    console.log('OpenAI Agent: Successfully analyzed email.');
    return {
      isSpam: parsedResponse.isSpam, // Corrected to camelCase
      reason: parsedResponse.reason,
      hasUnsubscribeLink: typeof parsedResponse.hasUnsubscribeLink === 'boolean' ? parsedResponse.hasUnsubscribeLink : false, // Corrected to camelCase
      identifiedLink: typeof parsedResponse.identifiedLink === 'string' ? parsedResponse.identifiedLink : null, // Corrected to camelCase
    };

  } catch (error) {
    console.error('OpenAI Agent: Error analyzing email content:', error.message);
    // It's important to return a consistent structure even in case of error
    return {
      isSpam: false, // Default to not spam in case of error to be cautious
      reason: `Error during AI analysis: ${error.message}`,
      hasUnsubscribeLink: false,
      identifiedLink: null,
    };
  }
}

module.exports = { analyzeEmailContent };