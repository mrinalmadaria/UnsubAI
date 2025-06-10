const { VertexAI } = require('@google-cloud/vertexai');

// Initialize Vertex AI
// Ensure GOOGLE_PROJECT_ID and GOOGLE_REGION are set in your environment
// Credentials will be automatically discovered if GOOGLE_APPLICATION_CREDENTIALS is set,
// or if running in a Google Cloud environment.
const project = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_REGION; // e.g., 'us-central1'

if (!project || !location) {
  throw new Error('Google Cloud Project ID and Region must be set in environment variables (GOOGLE_PROJECT_ID, GOOGLE_REGION)');
}

const vertex_ai = new VertexAI({ project: project, location: location });

// Specify the Gemini model - Using Gemini 1.5 Flash
// The exact model string might vary slightly based on regional availability or updates.
// 'gemini-1.5-flash-001' is a common identifier.
const model = 'gemini-1.5-flash-001';

const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  // Optional: Configure generation parameters if needed
  // generation_config: {
  //   maxOutputTokens: 2048, // Adjust as needed, ensure it's enough for the JSON
  //   temperature: 0.3,      // Lower for more deterministic JSON output
  // },
  // Optional: Configure safety settings if needed
  // safety_settings: [
  //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  //   { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'}
  // ],
});

/**
 * Analyzes email content using Gemini to determine if it's spam and find an unsubscribe link.
 * @param {string} subject The subject of the email.
 * @param {string} bodySnippet A snippet of the email body.
 * @returns {Promise<Object>} An object like { isSpam: boolean, reason: string, hasUnsubscribeLink: boolean, identifiedLink: string | null }
 */
async function analyzeEmailContent(subject, bodySnippet) {
  if (!subject && !bodySnippet) {
    console.warn('Gemini Agent: Subject and body snippet are empty. Cannot analyze.');
    return {
      isSpam: false,
      reason: 'No content provided to analyze.',
      hasUnsubscribeLink: false,
      identifiedLink: null,
    };
  }

  // Ensure the prompt clearly asks for JSON output.
  // Gemini can be very good at adhering to structured output if prompted correctly.
  const prompt = \`
    Analyze the following email content. Your task is to determine if it is spam and if it contains an unsubscribe link.
    Provide your response *strictly* as a single JSON object. Do not add any other text before or after the JSON object.
    The JSON object must have the following keys and value types:
    - "isSpam": boolean (true if the email is spam, false otherwise)
    - "reason": string (a brief explanation for the spam classification, or why it's not spam)
    - "hasUnsubscribeLink": boolean (true if an unsubscribe link is mentioned or found in the snippet, false otherwise)
    - "identifiedLink": string (the full URL of the unsubscribe link if found, otherwise null)

    Email Subject: "\${subject}"
    Email Body Snippet: "\${bodySnippet}"

    JSON Response:
  \`;

  try {
    console.log(\`Gemini Agent: Sending request to Gemini model '\${model}' for email analysis...\`);
    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    const resp = await generativeModel.generateContent(request);

    if (!resp.response ||
        !resp.response.candidates ||
        resp.response.candidates.length === 0 ||
        !resp.response.candidates[0].content ||
        !resp.response.candidates[0].content.parts ||
        resp.response.candidates[0].content.parts.length === 0 ||
        !resp.response.candidates[0].content.parts[0].text) {
      console.error('Gemini Agent: Invalid or empty response structure from Gemini:', JSON.stringify(resp, null, 2));
      throw new Error('Empty or invalid response content from Gemini.');
    }

    const rawJsonResponse = resp.response.candidates[0].content.parts[0].text;
    console.log('Gemini Agent: Raw response from Gemini:', rawJsonResponse);

    let parsedResponse;
    try {
      // Gemini might sometimes wrap the JSON in markdown (```json ... ```) or have leading/trailing spaces.
      const cleanedJsonResponse = rawJsonResponse.replace(/^[\`]{3}json\s*|\s*[\`]{3}$/g, '').trim();
      parsedResponse = JSON.parse(cleanedJsonResponse);
    } catch (parseError) {
      console.error('Gemini Agent: Failed to parse JSON response from Gemini.', parseError, 'Raw response was:', rawJsonResponse);
      return { // Return a structured error for parsing failure
        isSpam: false,
        reason: 'AI response parsing error. Could not determine spam status.',
        hasUnsubscribeLink: false,
        identifiedLink: null,
      };
    }

    // Validate the parsed response structure
    if (typeof parsedResponse.isSpam !== 'boolean' ||
        typeof parsedResponse.reason !== 'string' ||
        typeof parsedResponse.hasUnsubscribeLink !== 'boolean' ||
        (parsedResponse.identifiedLink !== null && typeof parsedResponse.identifiedLink !== 'string')) {
      console.error('Gemini Agent: Invalid structure or types in parsed JSON response:', parsedResponse);
      throw new Error('Invalid structure or types in parsed JSON response from Gemini.');
    }

    console.log('Gemini Agent: Successfully analyzed email with Gemini.');
    return parsedResponse; // Return the successfully parsed and validated object

  } catch (error) {
    console.error(\`Gemini Agent: Error analyzing email content with Gemini model '\${model}':\`, error.message);
    // Check for specific Google Cloud / Vertex AI error structures if available
    let reason = \`Error during Gemini AI analysis: \${error.message}\`;
    if (error.code) { // Google Cloud errors often have a 'code' property
        reason = \`Gemini API Error (Code: \${error.code}): \${error.message}\`;
    }
    if (error.message && error.message.toLowerCase().includes('quota')) {
        reason = \`Gemini API quota exceeded. Please check your Google Cloud billing and quotas. Details: \${error.message}\`;
    }

    return {
      isSpam: false,
      reason: reason,
      hasUnsubscribeLink: false,
      identifiedLink: null,
    };
  }
}

module.exports = { analyzeEmailContent };
