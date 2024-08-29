chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize Selected Text",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Summarize Entire Page",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let textToSummarize = "";

  if (info.menuItemId === "summarizeText") {
    textToSummarize = encodeURIComponent(info.selectionText);
  } else if (info.menuItemId === "summarizePage") {
    const pageContent = await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      })
      .then((results) => results[0].result);

    const url = "https://text-summarize-pro.p.rapidapi.com/summarizeFromUrl";
    const data = new FormData();
    data.append("url", tab.url); // Use the page's URL
    data.append("percentage", "10"); // Summary at 10% of the original content

    const options = {
      method: "POST",
      headers: {
        "x-rapidapi-key": "d107a4ab56msh11d670d2c0942fdp10b9aejsna0744363aa97",
        "x-rapidapi-host": "text-summarize-pro.p.rapidapi.com",
      },
      body: data,
    };

    try {
      const response = await fetch(url, options);
      const result = await response.text();
      console.log("Summary Result:", result);

      const summaryData = {
        text: info.selectionText || "Entire Page",
        summary: result,
        date: new Date().toISOString(),
      };

      chrome.storage.local.get({ summaryHistory: [] }, (data) => {
        const summaryHistory = data.summaryHistory;
        summaryHistory.push(summaryData);
        chrome.storage.local.set({ summaryHistory });
      });

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (summary) => {
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
              <strong>Summary:</strong>
              <p style="margin: 10px 0;">${summary}</p>
              <button id="copyBtn" style="background-color: #007bff; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Copy</button>
              <button id="closeBtn" style="background-color: #f00; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Close</button>
            `;

          document.body.appendChild(summaryDiv);

          document.getElementById("copyBtn").addEventListener("click", () => {
            navigator.clipboard.writeText(summary);
            alert("Summary copied to clipboard!");
          });

          document.getElementById("closeBtn").addEventListener("click", () => {
            summaryDiv.remove();
          });
        },
        args: [result],
      });
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSummaryHistory") {
    chrome.tabs.create({ url: chrome.runtime.getURL("summary-history.html") });
  }
});


