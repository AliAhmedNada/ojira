# Privacy Policy for ojira Extension

*Last updated: May 16, 2025*

## Introduction

This Privacy Policy describes how the ojira extension ("we", "our", or "extension") operates with respect to your data. We are committed to ensuring the privacy and security of your data.

## Zero Data Collection Policy

**We do not collect any data whatsoever.** The ojira extension is designed with privacy as a fundamental principle.

### How Your Information Is Handled

- **Jira Personal Access Token (PAT)**: Your Jira PAT is stored locally on your device only. It is never transmitted to our servers or any third parties. This token is only used to authenticate with your Jira account directly.

- **Jira URL**: Your Jira instance URL is stored locally on your device only to facilitate direct communication between the extension and your Jira instance.

### Local Operations Only

- **Jira Data**: The extension accesses data from your Jira account (including issue summaries, descriptions, comments, etc.) but this data remains within your browser and is never transmitted to us.

- **Tab Information**: The extension accesses the current tab URL and content solely to determine if you're on a Jira page and to extract relevant information for local processing.

- **Ollama Model Selection**: Your Ollama AI model preference is stored locally on your device only.

## How Your Data Stays Private

- **Authentication**: Your Jira PAT is used solely to authenticate API requests directly from your browser to your Jira instance. We never see, access, or store this information.

- **Functionality**: The extension functionality operates entirely locally:
  - All extraction of information from Jira pages happens in your browser
  - AI description generation happens locally via your Ollama installation
  - All Jira operations occur directly between your browser and your Jira instance
  - All metadata remains within your local environment

- **Communication with Ollama**: The extension communicates only with your locally running Ollama service to generate AI-powered descriptions. No data leaves your machine.

## Local Storage Only

- **Browser Storage**: Your Jira PAT, Jira URL, and Ollama model preferences are stored only in your browser's storage (`chrome.storage.sync`). If you have Chrome sync enabled, your browser may synchronize this data across your devices, but we never have access to it.

- **100% Local Operation**: All AI processing is performed locally through your installed Ollama service, not on remote servers.

- **No Data Collection**: We do not collect, transmit, or store any of your data on our servers. All operations happen exclusively on your device.

## Data Security

- **Zero Server Storage**: We maintain no servers or databases that store your information because we don't collect any data.

- **No Logging or Analytics**: We implement no logging, tracking, or analytics of any kind.

- **Debug Logging**: The extension includes console logging for debugging purposes, but these logs remain exclusively in your browser's console and are never transmitted to us or any third parties.

## Third-Party Services

- **Jira**: The extension interacts directly between your browser and your Jira instance using your provided PAT. Please refer to Atlassian's privacy policy for information on how they handle your data.

- **Ollama**: The extension communicates only with your locally running Ollama service. All AI processing occurs locally on your machine with no data being sent to external services.

## Your Control Over Your Data

- **Complete Control**: Since all data remains local to your device, you maintain complete control over it.

- **Clear Local Data**: You can clear your locally stored PAT at any time through the extension's options page.

- **Uninstall**: Uninstalling the extension will immediately remove all locally stored browser data.

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the extension repository and updating the "Last updated" date.

## Compliance with ATTRIBUTION REQUIREMENT

As specified in the LICENSE file, all derivative works or modified versions of this software must include appropriate attribution to the original author (alinada) in documentation, about pages, or wherever copyright notices are displayed. This attribution should include the original author's name and a reference to the original project.

## Contact Us

If you have any questions or concerns about this Privacy Policy, please contact the author through GitHub or the project repository.

---

By using the ojira extension, you agree to the terms outlined in this Privacy Policy.
