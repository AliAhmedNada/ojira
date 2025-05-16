# Privacy Policy for ojira Extension

*Last updated: May 16, 2025*

## Introduction

This Privacy Policy describes how the ojira extension ("we", "our", or "extension") collects, uses, stores, and protects your information when you use our browser extension. We are committed to ensuring the privacy and security of your data.

## Information We Collect

### Information You Provide

- **Jira Personal Access Token (PAT)**: We collect and store your Jira Personal Access Token which you enter in the extension options. This token is required to authenticate with your Jira account and perform actions on your behalf.

- **Jira URL**: We collect and store the URL of your Jira instance to make API calls to the correct endpoint.

### Information We Access

- **Jira Data**: The extension accesses data from your Jira account including issue summaries, descriptions, comments, assignees, project information, and issue types.

- **Tab Information**: The extension accesses the current tab URL and content to determine if you're on a Jira page and to extract relevant information.

### Local Data

- **Ollama Model Selection**: We store your selected Ollama AI model preference.

## How We Use Your Information

- **Authentication**: Your Jira PAT is used solely to authenticate API requests to your Jira instance.

- **Functionality**: We use your data to provide the core functionality of the extension, including:
  - Extracting information from Jira pages
  - Generating descriptions using Ollama AI
  - Creating and updating Jira issues
  - Fetching project metadata and issue types

- **Communication with Ollama**: The extension communicates with a locally running Ollama service to generate AI-powered descriptions.

## Data Storage

- **Chrome Storage**: Your Jira PAT, Jira URL, and Ollama model preferences are stored in Chrome's synchronized storage (`chrome.storage.sync`). This means your data may be synchronized across your Chrome instances if you have Chrome sync enabled.

- **Local Operation**: All AI processing is performed locally through your installed Ollama service, not on remote servers.

- **No External Transmission**: We do not transmit your PAT or other sensitive data to any third-party servers beyond your Jira instance and local Ollama service.

## Data Security

- **Local Storage**: Your Jira PAT is stored locally in your browser's synchronized storage.

- **No Logging**: We do not log or track your usage beyond what is necessary for the extension to function.

- **Debug Logging**: The extension includes console logging for debugging purposes, but these logs remain in your browser's console and are not transmitted elsewhere.

## Third-Party Services

- **Jira**: The extension interacts with your Jira instance using your provided PAT. Please refer to Atlassian's privacy policy for information on how they handle your data.

- **Ollama**: The extension communicates with your locally running Ollama service. All AI processing occurs locally on your machine.

## Your Choices

- **Clear Data**: You can clear your stored PAT at any time through the extension's options page.

- **Uninstall**: Uninstalling the extension will remove all locally stored data.

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the extension repository and updating the "Last updated" date.

## Compliance with ATTRIBUTION REQUIREMENT

As specified in the LICENSE file, all derivative works or modified versions of this software must include appropriate attribution to the original author (alinada) in documentation, about pages, or wherever copyright notices are displayed. This attribution should include the original author's name and a reference to the original project.

## Contact Us

If you have any questions or concerns about this Privacy Policy or our data practices, please contact the author through GitHub or the project repository.

---

By using the ojira extension, you agree to the terms outlined in this Privacy Policy.
