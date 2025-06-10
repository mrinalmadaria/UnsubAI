document.addEventListener('DOMContentLoaded', function() {
  const openWebAppBtn = document.getElementById('openWebAppBtn');

  if (openWebAppBtn) {
    openWebAppBtn.addEventListener('click', function() {
      // URL of your web application's client
      const webAppUrl = 'http://localhost:5173';
      chrome.tabs.create({ url: webAppUrl });
    });
  } else {
    console.error("Button with ID 'openWebAppBtn' not found.");
  }
});
