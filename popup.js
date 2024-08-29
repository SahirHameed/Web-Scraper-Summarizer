document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["openaiApiKey"], (result) => {
    if (result.openaiApiKey) {
      document.getElementById("apiKey").value = result.openaiApiKey;
    }
  });

  document.getElementById("saveApiKey").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
      alert("API Key saved successfully.");
    });
  });

  document
    .getElementById("summarizePage")
    .addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      document.getElementById("loadingSpinner").style.display = "block";

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => document.body.innerText || document.body.textContent,
        },
        async ([result]) => {
          if (result.result) {
            const pageContent = result.result;

            chrome.storage.local.get(["openaiApiKey"], async (data) => {
              const apiKey = data.openaiApiKey;
              if (!apiKey) {
                alert("Please enter your OpenAI API key.");
                document.getElementById("loadingSpinner").style.display =
                  "none";
                return;
              }

              try {
                const response = await fetch(
                  "https://api.openai.com/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: "gpt-3.5-turbo",
                      messages: [
                        {
                          role: "user",
                          content: `Summarize the following content:\n\n${pageContent}`,
                        },
                      ],
                      stream: true,
                    }),
                  }
                );

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let summary = "";
                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });

                  let boundary;
                  while ((boundary = buffer.indexOf("\n")) >= 0) {
                    const chunk = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 1);

                    if (chunk.startsWith("data: ")) {
                      try {
                        const jsonChunk = JSON.parse(chunk.slice(6)); // Remove the "data: " prefix
                        const content =
                          jsonChunk.choices[0]?.delta?.content || "";
                        summary += content;
                      } catch (e) {
                        console.error("JSON parse error:", e);
                      }
                    }
                  }
                }

                if (
                  summary.length < 50 ||
                  summary.toLowerCase().includes("error")
                ) {
                  alert("Invalid content received. No summary was saved.");
                  document.getElementById("loadingSpinner").style.display =
                    "none";
                  return;
                }

                // Save summary to local storage
                chrome.storage.local.get({ summaryHistory: [] }, (data) => {
                  const summaryHistory = data.summaryHistory;
                  summaryHistory.push({
                    url: tab.url,
                    text: tab.title || "Page",
                    summary: summary,
                    date: new Date().toISOString(),
                  });
                  chrome.storage.local.set({ summaryHistory }, () => {
                    console.log("Summary saved successfully!");
                  });
                });

                // Display summary popup
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

                    document
                      .getElementById("copyBtn")
                      .addEventListener("click", () => {
                        navigator.clipboard.writeText(summary);
                        alert("Summary copied to clipboard!");
                      });

                    document
                      .getElementById("closeBtn")
                      .addEventListener("click", () => {
                        summaryDiv.remove();
                      });

                    document
                      .getElementById("viewSummariesBtn")
                      .addEventListener("click", () => {
                        chrome.runtime.sendMessage({
                          action: "openSummaryHistory",
                        });
                      });
                  },
                  args: [summary, tab.title],
                });
              } catch (error) {
                console.error("Error during API request:", error);
                alert(
                  "Failed to retrieve a summary. Please check your API key and try again."
                );
              }
            });
          } else {
            alert("Could not fetch content. Please try again.");
          }
          document.getElementById("loadingSpinner").style.display = "none";
        }
      );
    });

  document
    .getElementById("viewSummaryHistory")
    .addEventListener("click", () => {
      chrome.tabs.create({ url: "summary-history.html" });
    });
});
