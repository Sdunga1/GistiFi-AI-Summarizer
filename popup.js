function showKeyIcon() {
  const keyIcon = document.getElementById("key-icon");
  keyIcon.style.display = "inline-block";
}

document.getElementById("summarize").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type");

  resultDiv.innerHTML = '<div class="loader"></div>';

  //Three steps
  // 1. Get the user's Gemini API key
  // 2. Ask content.js for the next page
  // 3. Send the text to the Gemini for processing

  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    const keyIcon = document.getElementById("key-icon");
    if (!geminiApiKey) {
      keyIcon.style.display = "inline-block";
    } else {
      keyIcon.style.display = "none";
    }
    if (!geminiApiKey) {
      resultDiv.innerHTML =
        "No API key is set. <b>Click the <span style='color:#F5E385;'>key icon</span></b> to add one.";
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
            resultDiv.innerHTML = `<pre style="white-space: pre-wrap; text-align: left;">${summary}</pre>`;
          } catch (error) {
            resultDiv.textContent = "Gemini error: " + error.message;
            showKeyIcon();
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
    brief: `Summarize in 2-4 sentences: \n\n${text}`,
    detailed: `Give a detailed summary in paragraphs of 4-5 sentences each in a clean manner:\n\n${text}`,
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
  const result =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "No Response... :( Please make sure you provided correct Gemini API Key. Click '🔑 symbol' to add the correct key";

  if (result.startsWith("No Response")) {
    showKeyIcon();
  }

  return result;
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
        "No API key is set. Click the Key icon to add one.";
      return;
    }

    const promptMap = {
      bigoh: `Strictly return only the time and space complexity in this format exactly:

      Time Complexity - O(...)
      Space Complexity - O(...)
      
      Do not add any explanations, descriptions, analysis, or extra sentences. Only return these two lines. Here is the code:\n\n${code}`,
      detailed: `Analyze the following code in exactly two paragraphs.
      First paragraph: Explain only the Time Complexity with reasoning. Do not include correctness or implementation critique.
      Second paragraph: Explain only the Space Complexity with reasoning. Do not include any mention of time complexity, correctness, or implementation notes.
      Only focus on the complexities. Do not include anything unrelated. Keep each paragraph 4-6 sentences long, and add a blank line between them.
      Here is the code:\n\n${code}`,
    };

    const prompt = promptMap[analysisType] || promptMap["bigoh"];

    try {
      const summary = await getSummaryFromGemini(
        prompt,
        "detailed",
        geminiApiKey
      );

      if (analysisType === "bigoh") {
        resultDiv.innerHTML = `<pre style="white-space: pre-wrap; font-size: 24px; text-align: center;">${summary}</pre>`;
      } else {
        const paragraphs = summary
          .split("\n\n")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        if (paragraphs.length >= 2) {
          resultDiv.innerHTML = `
            <h4>Time Complexity</h4>
            <p>${paragraphs[0]}</p>
            <h4>Space Complexity</h4>
            <p>${paragraphs[1]}</p>
          `;
        } else {
          resultDiv.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join("");
        }
      }
    } catch (err) {
      resultDiv.textContent = "Gemini error: " + err.message;
      showKeyIcon();
    }
  });
});

document.getElementById("key-icon").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
