document.getElementById("viewSummaryHistory").addEventListener("click", () => {
  chrome.tabs.create({ url: "summary-history.html" });
});

document.getElementById("summarizePage").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const loadingSpinner = document.getElementById("loadingSpinner");
  loadingSpinner.innerText = `Summarizing... Please wait.`;
  loadingSpinner.style.display = "block";

  const pageTitle = tab.title || "Page";
  let elapsedTime = 0;

  const updateElapsedTime = async () => {
    elapsedTime += 1;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (time) => {
        const loadingDiv = document.getElementById("customLoadingDiv");
        if (loadingDiv) {
          loadingDiv.innerText = `Summarizing page... ${time} seconds elapsed`;
        }
      },
      args: [elapsedTime],
    });
  };

  const elapsedInterval = setInterval(updateElapsedTime, 1000);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const loadingDiv = document.createElement("div");
      loadingDiv.style.position = "fixed";
      loadingDiv.style.bottom = "20px";
      loadingDiv.style.right = "20px";
      loadingDiv.style.backgroundColor = "#282c34";
      loadingDiv.style.color = "#fff";
      loadingDiv.style.padding = "10px 15px";
      loadingDiv.style.borderRadius = "5px";
      loadingDiv.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
      loadingDiv.style.zIndex = "10000";
      loadingDiv.style.fontSize = "14px";
      loadingDiv.style.fontFamily = "Arial, sans-serif";
      loadingDiv.innerText = `Summarizing page... 0 seconds elapsed`;
      loadingDiv.id = "customLoadingDiv";
      document.body.appendChild(loadingDiv);
    },
  });

  const url = `https://ai-web-summary.p.rapidapi.com/api/WebSummary?url=${encodeURIComponent(
    tab.url
  )}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "d107a4ab56msh11d670d2c0942fdp10b9aejsna0744363aa97",
      "x-rapidapi-host": "ai-web-summary.p.rapidapi.com",
    },
  };

  try {
    console.log("Sending API request...");
    const response = await fetch(url, options);
    const result = await response.text();
    console.log("API Response received:", result);

    // Check if the summary is valid (not empty or invalid)
    if (
      !result ||
      result.trim() === "" ||
      result.includes("error") ||
      result.length < 50
    ) {
      clearInterval(elapsedInterval);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const loadingDiv = document.getElementById("customLoadingDiv");
          if (loadingDiv) {
            loadingDiv.remove();
          }
        },
      });
      alert("Invalid content received. No summary was saved.");
      return;
    }

    // Save summary to local storage
    chrome.storage.local.get({ summaryHistory: [] }, (data) => {
      const summaryHistory = data.summaryHistory;
      summaryHistory.push({
        url: tab.url,
        text: pageTitle,
        summary: result,
        date: new Date().toISOString(),
      });
      chrome.storage.local.set({ summaryHistory });
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (summary, description) => {
        const summaryDiv = document.createElement("div");
        summaryDiv.style.position = "fixed";
        summaryDiv.style.bottom = "20px";
        summaryDiv.style.right = "20px";
        summaryDiv.style.backgroundColor = "#282c34";
        summaryDiv.style.color = "#fff";
        summaryDiv.style.padding = "15px";
        summaryDiv.style.borderRadius = "10px";
        summaryDiv.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
        summaryDiv.style.zIndex = "10000";
        summaryDiv.style.fontSize = "16px";
        summaryDiv.style.fontFamily = "Arial, sans-serif";
        summaryDiv.style.maxWidth = "400px";
        summaryDiv.style.overflow = "auto";
        summaryDiv.innerHTML = `
          <strong>Summary for: ${description}</strong>
          <p style="margin: 10px 0;">${summary}</p>
          <button id="copyBtn" style="background-color: #007bff; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Copy</button>
          <button id="closeBtn" style="background-color: #f00; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Close</button>
          <button id="viewSummariesBtn" style="background-color: #28a745; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Summaries</button>
        `;

        document.body.appendChild(summaryDiv);

        document.getElementById("copyBtn").addEventListener("click", () => {
          navigator.clipboard.writeText(summary);
          alert("Summary copied to clipboard!");
        });

        document.getElementById("closeBtn").addEventListener("click", () => {
          summaryDiv.remove();
        });

        document
          .getElementById("viewSummariesBtn")
          .addEventListener("click", () => {
            // Send a message to the background script to open the summary-history.html
            chrome.runtime.sendMessage({ action: "openSummaryHistory" });
          });

        // Remove the loading div
        const loadingDiv = document.getElementById("customLoadingDiv");
        if (loadingDiv) loadingDiv.remove();
      },
      args: [result, pageTitle],
    });
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Failed to retrieve a summary. Please try again later.");
    clearInterval(elapsedInterval);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const loadingDiv = document.getElementById("customLoadingDiv");
        if (loadingDiv) {
          loadingDiv.remove();
        }
      },
    });
  } finally {
    loadingSpinner.style.display = "none";
    clearInterval(elapsedInterval);
  }
});
