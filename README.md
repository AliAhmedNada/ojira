# ojira - AI Powered Jira Description Generator

## Introduction

ojira is a Chrome extension designed to supercharge your Jira workflow by leveraging the power of local AI models through Ollama. It helps you quickly generate comprehensive and well-structured Jira task descriptions based on the existing details on your Jira issue page. With ojira, you can save time, improve the quality of your Jira tickets, and ensure all relevant information is captured efficiently.

The extension fetches key information from the active Jira issue page, allows you to add custom instructions, and then communicates with your local Ollama instance to generate a suggested description. You can then easily insert this generated description back into the Jira issue.

## Key Features

*   **AI-Powered Description Generation:** Uses your local Ollama service to generate Jira task descriptions.
*   **Context-Aware:** Fetches details like Summary, Type, Assignee, Project, and existing Description from the active Jira page.
*   **Customizable Prompts:** Allows you to provide additional instructions to guide the AI in generating the description.
*   **Jira Integration:** Seamlessly inserts the generated description into the Jira issue description field.
*   **Local First:** Operates with your self-hosted Ollama instance, keeping your data local.
*   **Secure PAT Management:** Provides an options page to securely store your Jira Personal Access Token (PAT).
*   **Flexible Model Selection:** Allows you to choose which Ollama model to use for generation via the options page.
*   **User-Friendly Interface:** Simple popup interface for easy interaction.

## Prerequisites

Before you can use ojira, please ensure you have the following:

1.  **Google Chrome:** The extension is designed for the Google Chrome browser.
2.  **Ollama Installed and Running:** You need a local Ollama instance running on your machine. You can download it from [https://ollama.com/](https://ollama.com/). Ensure you have pulled the models you intend to use (e.g., `ollama pull llama3`).
3.  **Jira Account:** Access to a Jira instance where you can create and edit issues.
4.  **Jira Personal Access Token (PAT):** To allow the extension to update Jira issues on your behalf, you will need to generate a PAT from your Jira profile.

## Installation

Since ojira is a local development extension, you need to load it as an unpacked extension in Chrome:

1.  **Download the Extension:** Obtain the `ojira_extension_vX.X.X.zip` file and unzip it to a dedicated folder on your computer (e.g., `/path/to/ojira_extension_source`).
2.  **Open Chrome Extensions Page:** Open Google Chrome, type `chrome://extensions` in the address bar, and press Enter.
3.  **Enable Developer Mode:** In the top right corner of the Extensions page, toggle the "Developer mode" switch to the ON position.
4.  **Load Unpacked Extension:**
    *   Click the "Load unpacked" button that appears on the left side of the page.
    *   In the file dialog, navigate to the folder where you unzipped the extension files (e.g., `/path/to/ojira_extension_source`) and select this folder.
5.  **Verify Installation:** The "ojira" extension card should now appear on your Extensions page. You should also see its icon in your Chrome toolbar.

## Configuration

Before using the extension, you need to configure your Jira Personal Access Token (PAT) and ensure your Ollama server is correctly set up.

### 1. Jira Personal Access Token (PAT)

The extension requires a Jira PAT to securely interact with your Jira instance and update issue descriptions.

**Generating a Jira PAT:**

1.  Log in to your Jira instance.
2.  Go to your profile picture in the bottom left (or top right, depending on your Jira version) and click on it.
3.  Select "Profile" or "Account settings".
4.  Look for a section named "Personal Access Tokens" (the exact location might vary slightly based on your Jira version and configuration).
5.  Click "Create token".
6.  Give your token a descriptive name (e.g., "ojira Extension").
7.  Set an expiry date if desired (or leave it as no expiry, but be mindful of security implications).
8.  Ensure the token has sufficient permissions to read issue data and **write/update issue descriptions**. The specific permissions might be under scopes like `write:jira-work` or similar. Consult your Jira documentation if unsure.
9.  Click "Create". **Important:** Copy the generated token immediately. You will not be able to see it again.

**Saving the PAT in ojira:**

1.  Right-click on the ojira extension icon in your Chrome toolbar.
2.  Select "Options" from the context menu. This will open the ojira Settings page in a new tab.
3.  In the "Jira Personal Access Token (PAT)" section, paste your copied PAT into the input field.
4.  You can click the eye icon (👁️) to toggle the visibility of the token.
5.  Click the "Save Token" button.
6.  A status message will confirm if the token was saved successfully.

This token is stored securely in your browser's synchronized storage, meaning it will be available across Chrome instances where you are logged in with the same Google account.



### 2. Ollama Server Setup

The ojira extension relies on a locally running Ollama instance to generate text. You must have Ollama installed and running on your machine.

**Starting Ollama Server:**

Typically, you start the Ollama server from your command line interface (CLI) / terminal by running:

```bash
ollama serve
```

This will start the Ollama server, usually listening on `http://localhost:11434` by default.

**Important: Configuring Ollama for Extension Access (CORS - `OLLAMA_ORIGINS`)**

Chrome extensions run with a specific origin (e.g., `chrome-extension://[YOUR_EXTENSION_ID]`). For security reasons, web browsers (and thus Ollama, which is a web server) restrict requests from different origins unless explicitly allowed. If Ollama is not configured to accept requests from the ojira extension's origin, you will encounter a **403 Forbidden error** when the extension tries to communicate with it.

To resolve this, you need to set the `OLLAMA_ORIGINS` environment variable when starting your Ollama server. Here are a couple of ways to do this:

*   **Allowing All Origins (Easiest for Local Development & Testing):**
    This is the simplest way to get started, but it's less secure as it allows any webpage or application on your machine to access your Ollama instance.

    ```bash
    OLLAMA_ORIGINS=* ollama serve
    ```
    Or, if you also want Ollama to listen on all network interfaces (though usually not needed if the extension and Ollama are on the same machine):
    ```bash
    OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS=* ollama serve
    ```

*   **Allowing Specific Extension Origin (More Secure):**
    This method is more secure as it only allows your ojira extension to access Ollama.

    1.  **Find your ojira Extension ID:**
        *   Open Chrome and go to `chrome://extensions`.
        *   Ensure "Developer mode" is enabled (toggle in the top right).
        *   Find the "ojira" extension card.
        *   The **ID** will be a long string of characters (e.g., `abcdefghijklmnopqrstuvwxyzabcdef`). Copy this ID.

    2.  **Start Ollama with the Specific Origin:**
        Replace `[YOUR_EXTENSION_ID]` with the ID you copied.
        ```bash
        OLLAMA_ORIGINS=chrome-extension://[YOUR_EXTENSION_ID] ollama serve
        ```
        For example, if your extension ID is `mbkcfbghknehknhpbhjlnhhmoecmjbmg`, the command would be:
        ```bash
        OLLAMA_ORIGINS=chrome-extension://mbkcfbghknehknhpbhjlnhhmoecmjbmg ollama serve
        ```
    3.  **Allowing Multiple Specific Origins:**
        If you need to allow other local applications (e.g., a web UI for Ollama running on `http://localhost:3000`) in addition to the extension, you can provide a comma-separated list:
        ```bash
        OLLAMA_ORIGINS=http://localhost:3000,chrome-extension://[YOUR_EXTENSION_ID] ollama serve
        ```

**Verifying Ollama is Running and Accessible:**

*   You can check if Ollama is running by opening `http://localhost:11434` in your browser. You should see a message like "Ollama is running".
*   You can list available models by running `ollama list` in your terminal.
*   If you encounter issues, check the terminal output where you ran `ollama serve` for any error messages or logs.



### 3. Ollama Model Selection

ojira allows you to choose which Ollama model you want to use for generating descriptions. This is configured in the extension's Options page.

1.  **Access Options Page:** Right-click on the ojira extension icon in your Chrome toolbar and select "Options".
2.  **Locate Model Selection:** Find the "Ollama Model" section.
3.  **Fetch/Refresh Models:**
    *   When the Options page loads, it will attempt to fetch a list of available models from your running Ollama instance (`http://localhost:11434/api/tags`).
    *   If you have recently pulled new models to Ollama while the Options page was open, click the "Refresh Models" button to update the list.
    *   The dropdown will populate with the names of your available Ollama models (e.g., `llama3:latest`, `codellama:7b`, etc.).
    *   If Ollama is not running or no models are found, an appropriate message will be displayed.
4.  **Select a Model:** Choose your desired model from the dropdown list.
5.  **Save Selection:** Click the "Save Model Selection" button. A status message will confirm if the selection was saved.

The extension will use this selected model for all subsequent description generation requests. If no model is explicitly saved, it may default to a predefined model (e.g., `llama3`).

## Using ojira

Once installed and configured, using ojira is straightforward:

1.  **Navigate to a Jira Issue:** Open any Jira issue page in your Chrome browser.
2.  **Open the ojira Extension:** Click the ojira extension icon in your Chrome toolbar. This will open the ojira popup window.
3.  **Data Fetching:** The extension will automatically attempt to fetch the following details from the Jira page:
    *   Summary / Title
    *   Issue Type
    *   Assignee
    *   Project Name
    *   Current Description (if any)
    *   Last two comments (if available and accessible)
    These details will be displayed in the ojira popup and used as context for the AI.
4.  **Provide Additional Instructions (Optional):** In the "Your Instructions / Additional Context" text area, you can provide specific instructions or extra context to guide the AI in generating the description. For example, you might ask it to focus on certain aspects, adopt a particular tone, or include specific information.
5.  **Generate Description:** Click the "Generate Description with AI" button.
    *   The extension will send the fetched Jira data and your instructions to your local Ollama instance using the model you selected in the Options.
    *   The generated description will appear in the "Generated Description" text area.
6.  **Review and Edit (Optional):** Review the generated description. You can edit it directly in the text area if needed.
7.  **Insert into Jira:** Once you are satisfied with the description, click the "Insert into Jira" button.
    *   The extension will attempt to update the description field on the active Jira issue page with the content from the "Generated Description" text area.
    *   The Jira page should automatically refresh to show the updated description.

## Troubleshooting

If you encounter issues while using ojira, here are some common problems and solutions:

*   **Error: "Jira PAT not configured..."**
    *   **Solution:** You have not saved your Jira Personal Access Token. Go to the extension Options page (right-click extension icon > Options) and save your PAT as described in the "Configuration - Jira Personal Access Token (PAT)" section.

*   **Error: "Generation failed: ... Ollama API request failed ... 403 Forbidden ..."**
    *   **Solution:** This is almost always due to your Ollama server not being configured to accept requests from the extension. Please refer to the "Configuration - Ollama Server Setup" section, specifically the part about setting the `OLLAMA_ORIGINS` environment variable when you start `ollama serve`. Try `OLLAMA_ORIGINS=* ollama serve` first for testing.

*   **Error: "Generation failed: ... Could not connect to local Ollama API ... Failed to fetch ..."**
    *   **Solution:** Your local Ollama server is likely not running or is not accessible at `http://localhost:11434`.
        1.  Ensure you have started Ollama by running `ollama serve` in your terminal.
        2.  Verify it's running by visiting `http://localhost:11434` in your browser.
        3.  Check for any firewall or proxy settings that might be blocking local connections.

*   **Model Dropdown in Options is Empty or Shows Error:**
    *   **Solution:**
        1.  Ensure your Ollama server is running (see above).
        2.  Ensure you have pulled models into Ollama (e.g., `ollama pull llama3`).
        3.  Click the "Refresh Models" button on the Options page.
        4.  Check the Ollama server logs for any errors when the extension tries to fetch `/api/tags`.

*   **Selected Model Not Working / "Model ... is not available" Error:**
    *   **Solution:** The model name you selected in Options might not be available or correctly named in your Ollama instance. Use `ollama list` in your terminal to see the exact names of your available models and ensure your selection matches one of them.

*   **Description Not Inserting into Jira / No Page Refresh:**
    *   **Solution:**
        1.  Ensure your PAT has the correct permissions to update Jira issues.
        2.  Ensure you are on an active Jira issue page when clicking "Insert into Jira".
        3.  There might be a temporary issue with the Jira page structure or a conflict with another extension. Try refreshing the Jira page manually and trying again.
        4.  Check the browser console (Ctrl+Shift+J or Cmd+Option+J) for any error messages when you click the insert button.

*   **PAT Visibility Toggle Button Not Working:**
    *   **Solution:** If the eye icon to show/hide your PAT in the Options page isn't working, try reloading the extension (go to `chrome://extensions`, find ojira, and click its refresh icon or toggle it off and on). If the problem persists, check the browser console on the Options page for errors and consider reporting it as a bug.

If you continue to experience issues, checking the browser's developer console (for the extension popup or options page) and the Ollama server logs in your terminal are the best first steps for diagnosing the problem.

