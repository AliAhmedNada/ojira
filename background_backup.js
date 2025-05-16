// Background script (service worker) for Jira AI Description Generator (OpenAI Compatible)
// Handles communication with the OpenAI-compatible API and opening the extension window.

console.log("DEBUG: Background script loading (OpenAI Compatible Version - NIM Error Handling)...");

// --- Configuration ---
const OPENAI_COMPATIBLE_API_URL = "https://llama-3-3-70b-demo.apps.ocpnpgpu.alinma.internal/v1/chat/completions";
const OPENAI_COMPATIBLE_MODEL = "meta/llama-3.3-70b-instruct";
const POPUP_WINDOW_WIDTH = 520;
const POPUP_WINDOW_HEIGHT = 780;

let extensionWindowId = null;

// --- Action Click Handler (Opens Popup Window) ---
try {
    chrome.action.onClicked.addListener(async (tab) => {
        console.log("DEBUG: Extension icon clicked. Initiating tab object:", JSON.stringify(tab));

        let targetTabId = null;
        let targetTabUrl = null;
        let errorReason = null;

        if (tab && tab.id && tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
            targetTabId = tab.id;
            targetTabUrl = tab.url;
            console.log(`DEBUG: Using initiating tab directly. ID: ${targetTabId}, URL: ${targetTabUrl}`);
        } else {
            console.log("DEBUG: Initiating tab is not suitable. Querying for active tab in last focused normal window.");
            try {
                const [activeTabInLastFocusedWindow] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: "normal" });
                if (activeTabInLastFocusedWindow && activeTabInLastFocusedWindow.id && activeTabInLastFocusedWindow.url && (activeTabInLastFocusedWindow.url.startsWith("http://") || activeTabInLastFocusedWindow.url.startsWith("https://"))) {
                    targetTabId = activeTabInLastFocusedWindow.id;
                    targetTabUrl = activeTabInLastFocusedWindow.url;
                    console.log(`DEBUG: Found active tab in last focused normal window. ID: ${targetTabId}, URL: ${targetTabUrl}`);
                } else {
                    errorReason = "noSuitableActiveTab";
                    console.error("DEBUG: Could not find a suitable active tab in the last focused normal window.", activeTabInLastFocusedWindow);
                }
            } catch (e) {
                errorReason = "queryError";
                console.error("DEBUG: Error querying for active tab:", e);
            }
        }

        let popupUrl;
        if (targetTabId && targetTabUrl) {
            const encodedUrl = encodeURIComponent(targetTabUrl);
            popupUrl = chrome.runtime.getURL(`popup.html?tabId=${targetTabId}&tabUrl=${encodedUrl}`);
        } else {
            popupUrl = chrome.runtime.getURL(`popup.html?error=${errorReason || "unknownTargetTab"}`);
            console.log("DEBUG: Opening popup in error state with URL:", popupUrl);
        }

        const createData = {
            url: popupUrl,
            type: "popup",
            width: POPUP_WINDOW_WIDTH,
            height: POPUP_WINDOW_HEIGHT,
        };

        if (extensionWindowId !== null) {
            chrome.windows.get(extensionWindowId, {}, (existingWindow) => {
                if (chrome.runtime.lastError || !existingWindow) {
                    console.log("DEBUG: Previous window ID not found, creating new window with URL:", popupUrl);
                    chrome.windows.create(createData, (newWindow) => {
                        if (newWindow) extensionWindowId = newWindow.id;
                        else console.error("DEBUG: Failed to create new window.", chrome.runtime.lastError?.message);
                    });
                } else {
                    console.log("DEBUG: Focusing existing window and updating URL:", popupUrl);
                    chrome.tabs.query({ windowId: extensionWindowId }, (tabsInPopup) => {
                        if (tabsInPopup && tabsInPopup.length > 0 && tabsInPopup[0].id) {
                            chrome.tabs.update(tabsInPopup[0].id, { url: popupUrl }, () => {
                                chrome.windows.update(extensionWindowId, { focused: true });
                            });
                        } else {
                            console.warn("DEBUG: No valid tab found in existing popup window. Recreating.");
                            chrome.windows.remove(extensionWindowId, () => { 
                                extensionWindowId = null; 
                                chrome.windows.create(createData, (newWindow) => {
                                    if (newWindow) extensionWindowId = newWindow.id;
                                });
                            });
                        }
                    });
                }
            });
        } else {
            console.log("DEBUG: Creating new window with URL:", popupUrl);
            chrome.windows.create(createData, (newWindow) => {
                if (newWindow) extensionWindowId = newWindow.id;
                else console.error("DEBUG: Failed to create new window.", chrome.runtime.lastError?.message);
            });
        }
    });

    chrome.windows.onRemoved.addListener((removedWindowId) => {
        if (removedWindowId === extensionWindowId) {
            console.log("DEBUG: Monitored extension window closed, clearing windowId.");
            extensionWindowId = null;
        }
    });

} catch (actionListenerError) {
    console.error("DEBUG: Failed to add chrome.action.onClicked listener:", actionListenerError);
}

// --- OpenAI-compatible API Functions ---

function constructOpenAIMessages(taskData) {
    console.log("DEBUG: Constructing OpenAI messages with taskData:", JSON.stringify(taskData));
    let userPrompt = "Generate a concise and informative Jira task description based on the following details:\n\n";
    if (taskData.Summary) userPrompt += `- Summary: ${taskData.Summary.trim()}\n`;
    if (taskData.Type) userPrompt += `- Type: ${taskData.Type.trim()}\n`;
    if (taskData.Assignee) userPrompt += `- Assignee: ${taskData.Assignee.trim()}\n`;
    if (taskData.Project) userPrompt += `- Project: ${taskData.Project.trim()}\n`;
    if (taskData.CurrentDescription) userPrompt += `- Current Description: ${taskData.CurrentDescription.trim()}\n`;
    if (taskData.Comments) userPrompt += `- Last 2 Comments: ${taskData.Comments.trim()}\n`;
    if (taskData.Instructions && taskData.Instructions.trim() !== "") {
        userPrompt += `\nUser's Additional Context/Instructions:\n${taskData.Instructions.trim()}\n`;
    }

    const messages = [
        { 
            "role": "system", 
            "content": "You are an expert Jira assistant. Your task is to generate a concise, well-formatted, and informative Jira task description. Focus on clarity and actionability. If existing description is provided, refine or add to it based on other details and user instructions. If comments are provided, summarize key points if relevant to the description, write it in readme style, and avoid excessive detail. Use bullet points for clarity. Do not include any personal information or sensitive data."
        },
        {
            "role": "user",
            "content": userPrompt
        }
    ];
    console.log("DEBUG: Final constructed OpenAI messages:", JSON.stringify(messages));
    return messages;
}

async function generateDescriptionFromApi(taskData) {
    const messages = constructOpenAIMessages(taskData);
    const requestBody = {
        model: OPENAI_COMPATIBLE_MODEL,
        messages: messages,
    };

    console.log(`DEBUG: Sending generation request to NIM API: ${OPENAI_COMPATIBLE_API_URL}`);
    console.log("DEBUG: NIM API Request Body:", JSON.stringify(requestBody, null, 2));
    let responseStatus = 0;
    let responseStatusText = "";
    let responseBodyTextForError = "(Could not retrieve response body for error)";

    try {
        const response = await fetch(OPENAI_COMPATIBLE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(requestBody),
        });

        responseStatus = response.status;
        responseStatusText = response.statusText;
        console.log(`DEBUG: NIM API response status: ${responseStatus} ${responseStatusText}`);
        
        responseBodyTextForError = await response.text(); // Get text for logging or error reporting
        console.log("DEBUG: NIM API Response Body Text:", responseBodyTextForError);

        if (!response.ok) {
            console.error("DEBUG: NIM API request failed.", responseStatus, responseBodyTextForError);
            throw new Error(`NIM API request failed with status ${responseStatus} ${responseStatusText}: ${responseBodyTextForError}`);
        }
        
        const data = JSON.parse(responseBodyTextForError); // Parse after logging and OK check
        console.log("DEBUG: Parsed NIM API response data:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("DEBUG: NIM API returned an error object in response:", data.error);
            let apiErrorMessage = "Unknown API error";
            if (typeof data.error === 'string') {
                apiErrorMessage = data.error;
            } else if (data.error.message) {
                apiErrorMessage = data.error.message;
            } else {
                apiErrorMessage = JSON.stringify(data.error);
            }
            throw new Error(`NIM API returned an error: ${apiErrorMessage}`);
        }
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            const description = data.choices[0].message.content.trim();
            console.log("DEBUG: NIM API generation successful, description length:", description.length);
            return description;
        } else {
            console.error("DEBUG: Unexpected NIM API response format (no choices/content):", data);
            throw new Error("Unexpected NIM API response format. Could not extract description. Full response: " + responseBodyTextForError.substring(0, 500));
        }

    } catch (error) {
        console.error("DEBUG: Error calling NIM generation API:", error.name, error.message);
        if (error.message.includes("Failed to fetch")) {
             throw new Error(`Network error: Could not connect to NIM API at ${OPENAI_COMPATIBLE_API_URL}. Check URL, network, and CORS policy on the server. (Original: ${error.message})`);
        } else if (error instanceof SyntaxError) {
            throw new Error(`API response parsing error: Could not parse JSON response. Status: ${responseStatus} ${responseStatusText}. Response: ${responseBodyTextForError.substring(0,500)} (Original: ${error.message})`);
        }
        // Re-throw other errors, or the enriched ones from above
        throw error; 
    }
}

// --- Message Listener ---
try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("DEBUG: Background script received message:", request, "from sender:", sender);

        if (request.action === "generateDescriptionPopup") {
            console.log("DEBUG: Handling generateDescriptionPopup request.");
            if (!request.data) {
                console.error("DEBUG: Missing data in generateDescriptionPopup request.");
                sendResponse({ success: false, error: "Task data not provided in request." });
                return false; 
            }

            generateDescriptionFromApi(request.data)
                .then(description => {
                    console.log("DEBUG: Sending generation response (success). Description length:", description.length);
                    sendResponse({ success: true, description: description });
                })
                .catch(error => {
                    console.error("DEBUG: Error during generation, sending error response to popup.", error.message);
                    sendResponse({ success: false, error: `Generation Error: ${error.message}` || "Unknown error occurred during generation" });
                });

            return true; // Indicates asynchronous response
        }

        console.log("DEBUG: Background message action not recognized:", request.action);
        return false; 
    });
} catch (addListenerError) {
    console.error("DEBUG: Failed to add runtime.onMessage listener in background script:", addListenerError);
}

console.log("DEBUG: Background script initialized (OpenAI Compatible Version - NIM Error Handling).");

