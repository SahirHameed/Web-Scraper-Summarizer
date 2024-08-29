document.addEventListener("DOMContentLoaded", () => {
  // Function to render summaries on the page
  const renderSummaries = (summaries) => {
    const summaryList = document.getElementById("summaryList");
    summaryList.innerHTML = "";

    if (summaries.length === 0) {
      summaryList.innerHTML = "<p>No summaries available.</p>";
    } else {
      summaries.forEach((item, index) => {
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "summary-item";
        summaryDiv.innerHTML = `
          <h3>Summary for: ${item.text}</h3>
          <p><strong>Date:</strong> ${new Date(item.date).toLocaleString()}</p>
          <p><strong>URL:</strong> <a href="${item.url}" target="_blank">${
          item.url
        }</a></p>
          <p id="summaryText-${index}">${item.summary}</p>
          <button id="copyBtn-${index}" style="background-color: #007bff; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Copy Summary</button>
        `;
        summaryList.appendChild(summaryDiv);

        // Add copy event listener
        document
          .getElementById(`copyBtn-${index}`)
          .addEventListener("click", () => {
            const summaryText = document.getElementById(
              `summaryText-${index}`
            ).innerText;
            navigator.clipboard.writeText(summaryText).then(() => {
              alert("Summary copied to clipboard!");
            });
          });
      });
    }
  };

  // Load summaries from chrome.storage.local
  const loadSummaries = () => {
    chrome.storage.local.get({ summaryHistory: [] }, (data) => {
      renderSummaries(data.summaryHistory);
    });
  };

  // Search functionality
  document.getElementById("searchBar").addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    chrome.storage.local.get({ summaryHistory: [] }, (data) => {
      const filteredSummaries = data.summaryHistory.filter(
        (item) =>
          item.text.toLowerCase().includes(searchTerm) ||
          item.summary.toLowerCase().includes(searchTerm) ||
          item.url.toLowerCase().includes(searchTerm) ||
          new Date(item.date)
            .toLocaleString()
            .toLowerCase()
            .includes(searchTerm)
      );
      renderSummaries(filteredSummaries);
    });
  });

  // Clear all summaries
  document.getElementById("clearSummaries").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all summaries?")) {
      chrome.storage.local.set({ summaryHistory: [] }, () => {
        loadSummaries();
      });
    }
  });

  // Initially load summaries
  loadSummaries();
});
