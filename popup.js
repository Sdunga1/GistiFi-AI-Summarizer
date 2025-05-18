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
            resultDiv.style.textAlign = "left";
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

document.getElementById("analyze-btn").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  const code = document.getElementById("code-input").value.trim();
  const analysisType = document.getElementById("code-analysis-type").value;

  if (!code) {
    resultDiv.textContent = "Please paste some code to analyze.";
    return;
  }

  resultDiv.innerHTML = '<div class="loader"></div>';

  chrome.storage.sync.get(["geminiApiKey"], async ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.textContent =
        "No API key is set. Click the gear icon to add one.";
      return;
    }

    const promptMap = {
      bigoh: `Give the Big-Oh notation of time and space complexity of the following code. Only provide Big-O notation for time and space. Do not give additional information\n\n${code}`,
      detailed: `Do a full analysis of the code below: include time complexity, space complexity, and reasoning in 5-12 sentences.\n\n${code}`,
    };

    const prompt = promptMap[analysisType] || promptMap["bigoh"];

    try {
      const summary = await getSummaryFromGemini(
        prompt,
        "detailed",
        geminiApiKey
      );
      resultDiv.style.textAlign =
        analysisType === "bigoh" ? "center" : "inherit";
      resultDiv.style.fontSize = analysisType === "bigoh" ? "24px" : "inherit";
      resultDiv.textContent = summary;
    } catch (err) {
      resultDiv.textContent = "Gemini error: " + err.message;
    }
  });
});
