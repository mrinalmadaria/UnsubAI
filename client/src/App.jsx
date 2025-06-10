import React, { useState, useEffect, useRef } from "react";

function App() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [spamEmails, setSpamEmails] = useState([]);
  const [otherEmails, setOtherEmails] = useState([]); // Optional, but good to have
  const [analysisSummary, setAnalysisSummary] = useState(null); // To store { totalAnalyzed, spamCount }
  const [error, setError] = useState(''); // For displaying errors from analysis
  const [initialAnalysisStarted, setInitialAnalysisStarted] = useState(false);

  // Listen for messages from the OAuth popup window
  useEffect(() => {
  function handleMessage(event) {
    console.log("Received message:", event.data, "from:", event.origin);
    
    // Accept messages from your backend
    if (event.origin === "http://localhost:5000") { // Your backend origin
      if (event.data && event.data.access_token) {
        console.log("Setting access token from OAuth popup:", event.data.access_token);
        setAccessToken(event.data.access_token);
        setInitialAnalysisStarted(false); // Reset for new token
        // Clear previous results when a new user logs in
        setSpamEmails([]);
        setOtherEmails([]);
        setAnalysisSummary(null);
        setError('');
      }
    }
  }
  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []); // Empty dependency array is correct here for window event listener

  // Open popup for Google OAuth
  const handleLogin = () => {
    window.open(
      "http://localhost:5000/auth/google",
      "googleLogin",
      "width=500,height=600"
    );
  };

  // Analyze inbox using the access token
  const handleAnalyze = async () => {
    setLoading(true);
    setSpamEmails([]); // Clear previous results
    setOtherEmails([]);
    setAnalysisSummary(null);
    setError(''); // Clear previous errors
    try {
      const res = await fetch("/gmail/analyze", { // Ensure this path is correct (e.g. /api/gmail/analyze if you have a base API path)
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle HTTP errors (e.g., 401, 500) from the backend
        throw new Error(data.error || `Error ${res.status}`);
      }
      setSpamEmails(data.spamMessages || []);
      setOtherEmails(data.otherMessages || []);
      setAnalysisSummary(data.summary || null);
    } catch (err) {
      console.error("Error analyzing inbox:", err);
      setError(err.message || "Failed to analyze inbox.");
      // alert("Error analyzing inbox: " + err.message); // Or use a more integrated error display
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    console.log("Signing out...");
    setAccessToken("");
    setSpamEmails([]);
    setOtherEmails([]);
    setAnalysisSummary(null);
    setError("");
    setInitialAnalysisStarted(false); // Reset this flag as well
    // If you were persisting the token in localStorage, you'd clear it here too:
    // localStorage.removeItem("accessToken");
  };

  // useEffect for automatic analysis on new accessToken
  useEffect(() => {
    // Only run if accessToken is present, not loading, and initial analysis hasn't started for this token
    if (accessToken && !loading && !initialAnalysisStarted) {
      console.log("New accessToken detected, triggering initial analysis.");
      setInitialAnalysisStarted(true); // Mark as started to prevent re-triggering
      handleAnalyze();
    }
  }, [accessToken, loading, initialAnalysisStarted]); // Add handleAnalyze to dependency array if it's not stable

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>UnsubAI</h1>
      {!accessToken ? (
        <button onClick={handleLogin} style={{ marginBottom: 16, padding: '10px 15px', fontSize: '16px' }}>
          Sign in with Google
        </button>
      ) : (
        <div style={{ margin: "1rem 0" }}>
          <p style={{ fontSize: '0.9rem', color: '#555' }}>
            Signed in. Access token (first 20 chars): {accessToken.substring(0,20)}...
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ padding: '10px 15px', marginRight: '10px' }}
          >
            {loading && !analysisSummary ? "Analyzing..." : (analysisSummary ? "Re-Analyze Inbox" : "Analyze Inbox")}
          </button>
          <button
            onClick={handleSignOut}
            style={{ padding: '10px 15px', backgroundColor: '#f44336', color: 'white', border: 'none' }}
          >
            Sign Out
          </button>
        </div>
      )}
      {/* Display Error Messages */}
      {error && (
        <div style={{ color: 'red', marginTop: '1rem', padding: '0.5rem', border: '1px solid red' }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* Display Analysis Summary */}
      {analysisSummary && !loading && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0' }}>
          <h3>Analysis Summary</h3>
          <p>Total emails analyzed: {analysisSummary.totalAnalyzed}</p>
          <p>Spam emails found: {analysisSummary.spamCount}</p>
        </div>
      )}

      {/* Display Spam Emails */}
      {spamEmails.length > 0 && !loading && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Spam Emails</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {spamEmails.map((email) => (
              <li key={email.messageId} style={{ border: '1px solid #ccc', borderRadius: '4px', marginBottom: '1rem', padding: '1rem' }}>
                <p><strong>From:</strong> {email.from}</p>
                <p><strong>Subject:</strong> {email.subject}</p>
                <p><em><small>Snippet: {email.snippet}</small></em></p>
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff0f0', border: '1px solid #ffcccc' }}>
                  <p><strong>AI Analysis:</strong> {email.aiAnalysis.reason}</p>
                  {email.aiAnalysis.hasUnsubscribeLink && email.aiAnalysis.identifiedLink && (
                    <p>
                      <strong>Unsubscribe Link:</strong>{' '}
                      <a href={email.aiAnalysis.identifiedLink} target="_blank" rel="noopener noreferrer">
                        {email.aiAnalysis.identifiedLink}
                      </a>
                    </p>
                  )}
                  {!email.aiAnalysis.hasUnsubscribeLink && email.aiAnalysis.isSpam && (
                     <p><em>AI did not identify a direct unsubscribe link in the snippet.</em></p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional: Display if no spam emails were found but analysis was done */}
      {!loading && analysisSummary && spamEmails.length === 0 && error === '' && (
        <div style={{ marginTop: '1rem' }}>
          <p>No spam emails identified in the latest analysis.</p>
        </div>
      )}

    </div>
  );
}

export default App;