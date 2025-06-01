function getArticleText() {
  const article = document.querySelector("article");
  if (article) return article.innerText;

  const paragraphs = Array.from(document.querySelectorAll("p"));
  if (paragraphs.length) {
    return paragraphs.map((p) => p.innerText).join("\n");
  }

  return document.body?.innerText || "No readable content found.";
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const text = getArticleText();
    sendResponse({ text });
    return true;
  }
});
