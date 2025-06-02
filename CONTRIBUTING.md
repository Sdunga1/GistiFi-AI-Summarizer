# Contributing to GistiFi AI Summarizer

Thank you for your interest in contributing to **GistiFi AI Summarizer**! Whether you're here to fix a bug, propose a feature, or improve documentation, you're very welcome. This guide will walk you through the steps to set up the project and start contributing.

## Overview

GistiFi is a Chrome Extension that allows users to:

• Summarize articles in brief, detailed, or bullet format
• Analyze code snippets for time and space complexity using the Gemini API
• Use the extension without login and with full privacy

All contributions are handled client side and respect user data.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Sdunga1/GistiFi-AI-Summarizer.git
cd GistiFi-AI-Summarizer
```

### 2. Load the Extension Locally

You don't need to install packages or run any build tools. Just follow these steps:

1. Open Google Chrome
2. Navigate to `chrome://extensions`
3. Enable Developer mode (top right toggle)
4. Click Load unpacked
5. Select the root folder of this repository

The GistiFi extension icon should now appear in your browser toolbar.

## Project Structure

```
GistiFi-AI-Summarizer/
│
├── assets/            # Images and icons
├── html/              # Extension UI (popup, options, reloadPrompt)
├── icons/             # Chrome page icons
├── scripts/           # Main logic (options.js, popup.js, content.js)
├── styles/            # CSS for various UI pages
├── manifest.json      # Chrome Extension configuration
├── background.js      # Background script of extension
├── README.md
└── CONTRIBUTING.md
```

## Ways to Contribute

You can help improve GistiFi in many ways:

### Bug Fixes

If something doesn't work as expected, report it in the issues tab. If you know the fix, feel free to open a pull request.

### Feature Suggestions

New summarization formats, better UX, customization options — feel free to pitch ideas by opening an issue or pull request.

### UI Enhancements

You can improve the UI or responsiveness of popup and settings pages, especially for mobile and dark mode support.

### Code Cleanup

Refactor repetitive code, add comments, or make things more modular and readable.

### Docs and Guides

Improve clarity in README.md, FAQ, or step by step setup documents. Good documentation helps everyone.

## How to Contribute Code

### 1. Create a New Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Test them locally by loading the extension as described earlier.

### 3. Commit

Use clear and consistent commit messages.

```bash
git add .
git commit -m "Add: Description of your change"
```

### 4. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then go to the GitHub repo, compare your branch, and open a pull request.

## Pull Request Checklist

• Keep PRs focused and minimal. Avoid combining unrelated changes.
• Test your feature or fix on real webpages.
• Explain your changes clearly in the pull request.
• If possible, include screenshots or gifs for UI updates.

## Need Help?

Feel free to:

• Open a GitHub issue
• Email: sdunga1@asu.edu
• Reach out on LinkedIn

## Code of Conduct

Please be respectful in all interactions. Treat others as you would in a professional team setting. Constructive feedback and collaboration are encouraged.

## Thank You

Every contribution makes a difference — from fixing typos to adding entire features. Thanks again for helping make GistiFi better.

**Maintained by:** Sarath Kumar Dunga | [Linkedin] (https://www.linkedin.com/in/sarath-kumar-dunga-0684a4360/) | [Portfolio] (https://portfolio-sarathkumardunga.vercel.app/)

**Links:**
• [GistiFi Chrome Extension (official)](https://chromewebstore.google.com/detail/oejfheefemcebogcabeedgikkhdgpdhg?utm_source=item-share-cb)
• [GitHub Repository](https://github.com/Sdunga1/GistiFi-AI-Summarizer)
