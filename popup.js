document.getElementById("summarize").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type");

  resultDiv.innerHTML = '<div class="loader"></div>';

  //Three steps
  // 1. Get the user's Gemini API key
  // 2. Ask content.js for the next page
  // 3. Send the text to the Gemini for processing

  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.textContent =
        "No API key is set. Click the gear icon to add one.";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async ({ text }) => {
          if (!text) {
            resultDiv.textContent = "Couldn't extract text from this page.";
            return;
          }

          try {
            const summary = await getSummaryFromGemini(
              text,
              summaryType.value,
              geminiApiKey
            );
            resultDiv.textContent = summary;
          } catch (error) {
            resultDiv.textContent = "Gemini error: " + error.message;
          }
        }
      );
    });
  });
});

async function getSummaryFromGemini(rawText, type, apiKey) {
  const max = 30000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

  const promptMap = {
    brief: `Summarize in 2-3 sentences: \n\n${text}`,
    detailed: `Give a detailed summary:\n\n${text}`,
    bullets: `Summarize in 5-7 bullet points (Start each line with listed bullet style symbol):\n\n${text}`,
  };

  const prompt = promptMap[type] || prompt["brief"];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!res) {
    const { error } = await res.json();
    throw new Error(error?.message || "Request failed. Try after some time!");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No Summary.";
}

document.getElementById("copy-btn").addEventListener("click", () => {
  const summarizedText = document.getElementById("result").innerText;
  if (!summarizedText) return;

  navigator.clipboard.writeText(summarizedText).then(() => {
    const btn = document.getElementById("copy-btn");
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn, (textContent = old)), 2000);
  });
});
