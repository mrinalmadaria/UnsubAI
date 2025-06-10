import React, { useState, useEffect, useRef } from "react";

function App() {
  const [accessToken, setAccessToken] = useState("");
  const [senders, setSenders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listen for messages from the OAuth popup window
  useEffect(() => {
  function handleMessage(event) {
    console.log("Received message:", event.data, "from:", event.origin);
    
    // Accept messages from your backend
    if (event.origin === "http://localhost:5000") {
      if (event.data && event.data.access_token) {
        console.log("Setting access token:", event.data.access_token);
        setAccessToken(event.data.access_token);
      }
    }
  }
  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);

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
    setSenders([]);
    setSuggestions([]);
    try {
      const res = await fetch("/gmail/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      setSenders(data.senders || []);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      alert("Error analyzing senders: ", err);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>UnsubAI</h1>
      <button onClick={handleLogin} style={{ marginBottom: 16 }}>
        Sign in with Google
      </button>
      <div style={{ margin: "1rem 0" }}>
        <input
          type="text"
          placeholder="Access token will appear here"
          value={accessToken}
          onChange={e => setAccessToken(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
          readOnly
        />
        <button onClick={handleAnalyze} disabled={!accessToken || loading}>
          {loading ? "Analyzing..." : "Analyze Inbox"}
        </button>
      </div>
      {senders.length > 0 && (
        <div>
          <h2>Senders</h2>
          <ul>
            {senders.map(sender => (
              <li
                key={sender}
                style={{
                  color: suggestions.includes(sender) ? "red" : "black",
                  fontWeight: suggestions.includes(sender) ? "bold" : "normal",
                }}
              >
                {sender}
                {suggestions.includes(sender) && " (AI suggests unsubscribing)"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;