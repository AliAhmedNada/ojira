// Background script (service worker) for ojira
// Handles communication with the local Ollama service, Jira API, and opening the extension window.

console.log("DEBUG: Background script loading (Ollama Local Version - Model Selection - Jira Create Meta)...");

// --- Configuration ---
const OLLAMA_CONFIG = {
    baseUrl: "http://localhost:11434",  // Localhost URL for Ollama service
    chatEndpoint: "/v1/chat/completions",
    timeout: 60000  // Adding timeout
};

// Define the API URL constant referenced later in the code
const OLLAMA_API_URL = `${OLLAMA_CONFIG.baseUrl}${OLLAMA_CONFIG.chatEndpoint}`;

// Helper function to communicate with Ollama
async function fetchOllama(endpoint, body) {
    try {
        console.log(`DEBUG: Sending request to Ollama at ${OLLAMA_CONFIG.baseUrl}${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);
        
        const response = await fetch(`${OLLAMA_CONFIG.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama request failed: ${response.status} ${text}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ollama request error:', error);
        throw new Error(`Failed to communicate with Ollama: ${error.message}`);
    }
}

const DEFAULT_OLLAMA_MODEL = "llama3"; 
const POPUP_WINDOW_WIDTH = 600;
const POPUP_WINDOW_HEIGHT = 800;

let extensionWindowId = null;

// --- Helper: Get Stored PAT and Jira URL ---
async function getJiraCredentials() {
    console.log("DEBUG: Getting Jira credentials from storage");
    const result = await chrome.storage.sync.get(["jiraPat", "jiraUrl"]);
    console.log("DEBUG: Storage returned - PAT exists:", !!result.jiraPat, "URL exists:", !!result.jiraUrl);
    
    if (!result.jiraPat) {
        console.error("DEBUG: Missing Jira PAT in storage");
        throw new Error("Jira Personal Access Token (PAT) not configured. Please set it in the extension options.");
    }
    
    if (!result.jiraUrl) {
        console.error("DEBUG: Missing Jira URL in storage");
        throw new Error("Jira URL not configured. Please set it in the extension options.");
    }
    
    const jiraBaseUrl = result.jiraUrl.replace(/\/$/, ""); // Remove trailing slash if any
    console.log("DEBUG: Credentials retrieved successfully. URL:", jiraBaseUrl);
    return { pat: result.jiraPat, jiraBaseUrl };
}

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
        } else {
            try {
                const [activeTabInLastFocusedWindow] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: "normal" });
                if (activeTabInLastFocusedWindow && activeTabInLastFocusedWindow.id && activeTabInLastFocusedWindow.url && (activeTabInLastFocusedWindow.url.startsWith("http://") || activeTabInLastFocusedWindow.url.startsWith("https://"))) {
                    targetTabId = activeTabInLastFocusedWindow.id;
                    targetTabUrl = activeTabInLastFocusedWindow.url;
                } else {
                    errorReason = "noSuitableActiveTab";
                }
            } catch (e) {
                errorReason = "queryError";
            }
        }

        let popupUrl;
        if (targetTabId && targetTabUrl) {
            const encodedUrl = encodeURIComponent(targetTabUrl);
            popupUrl = chrome.runtime.getURL(`popup.html?tabId=${targetTabId}&tabUrl=${encodedUrl}`);
        } else {
            popupUrl = chrome.runtime.getURL(`popup.html?error=${errorReason || "unknownTargetTab"}`);
        }

        const createData = {
            url: popupUrl,
            type: "popup",
            width: POPUP_WINDOW_WIDTH,
            height: POPUP_WINDOW_HEIGHT,
            focused: true
        };

        if (extensionWindowId !== null) {
            chrome.windows.get(extensionWindowId, {}, (existingWindow) => {
                if (chrome.runtime.lastError || !existingWindow) {
                    chrome.windows.create(createData, (newWindow) => { if (newWindow) extensionWindowId = newWindow.id; });
                } else {
                    chrome.tabs.query({ windowId: extensionWindowId }, (tabsInPopup) => {
                        if (tabsInPopup && tabsInPopup.length > 0 && tabsInPopup[0].id) {
                            chrome.tabs.update(tabsInPopup[0].id, { url: popupUrl }, () => {
                                chrome.windows.update(extensionWindowId, { focused: true });
                            });
                        } else {
                            chrome.windows.remove(extensionWindowId, () => { 
                                extensionWindowId = null; 
                                chrome.windows.create(createData, (newWindow) => { if (newWindow) extensionWindowId = newWindow.id; });
                            });
                        }
                    });
                }
            });
        } else {
            chrome.windows.create(createData, (newWindow) => { if (newWindow) extensionWindowId = newWindow.id; });
        }
    });

    chrome.windows.onRemoved.addListener((removedWindowId) => {
        if (removedWindowId === extensionWindowId) {
            extensionWindowId = null;
        }
    });

} catch (actionListenerError) {
    console.error("DEBUG: Failed to add chrome.action.onClicked listener:", actionListenerError);
}

// --- Ollama API Functions ---
function constructOllamaMessages(taskData) {
    console.log("DEBUG: Constructing Ollama messages with taskData:", JSON.stringify(taskData));
    
    const systemPrompt = "You are an experienced Jira issue writer. Your task is to analyze the user's prompt and generate both a summary and description that accurately reflect the user's requirements. Format your response with SUMMARY: followed by a one-line title (max 255 chars), then DESCRIPTION: followed by the detailed description in Markdown format. Ensure all content is derived from the user's prompt.";

    let userPrompt = "";
    let instructions = "";

    if (taskData.GenerateType === "both") {
        // For new issues, just use the instructions
        userPrompt = `Based on this request, generate both a summary title and detailed description:\n${taskData.Instructions}\n`;
        if (taskData.Project) userPrompt += `\nProject Context: ${taskData.Project}`;
        if (taskData.Type) userPrompt += `\nIssue Type: ${taskData.Type}`;
        
        instructions = `Based on the user's prompt above, generate:

1. SUMMARY: Generate a single-line summary that captures the core purpose. The summary should:
   - Be clear, concise, and specific
   - Be between 50-100 characters
   - Use active voice
   - Focus on the key deliverable or objective
   - Start with a verb when possible
   
2. DESCRIPTION: Generate a comprehensive description that includes:
   - Overview/Background
   - Detailed Requirements
   - Acceptance Criteria
   - Technical Details (if applicable)
   - Dependencies/Prerequisites (if any)
   - Additional Notes/Context

Format your response exactly as:
SUMMARY: Your one-line summary here
DESCRIPTION: Your detailed description here
write in Markdown format.
`;
    } else {
        // For existing issues, incorporate existing context
        userPrompt = "Please analyze the following information and generate an improved summary and description:\n\n";
        if (taskData.Summary) userPrompt += `Current Summary: ${taskData.Summary.trim()}\n`;
        if (taskData.Type) userPrompt += `Type: ${taskData.Type.trim()}\n`;
        if (taskData.Assignee) userPrompt += `Assignee: ${taskData.Assignee.trim()}\n`;
        if (taskData.Project) userPrompt += `Project: ${taskData.Project.trim()}\n`;
        if (taskData.CurrentDescription) userPrompt += `Current Description: ${taskData.CurrentDescription.trim()}\n`;
        if (taskData.Comments) userPrompt += `Last Comments: ${taskData.Comments.trim()}\n`;
        if (taskData.Instructions) userPrompt += `\nUser's Additional Instructions: ${taskData.Instructions.trim()}\n`;
    }

    if (instructions) {
        userPrompt += "\n\n" + instructions;
    }

    return [
        { "role": "system", "content": systemPrompt },
        { "role": "user", "content": userPrompt }
    ];
}

async function generateDescriptionFromApi(taskData) {
    const storedData = await chrome.storage.sync.get(["ollamaModel"]);
    const selectedModel = storedData.ollamaModel || DEFAULT_OLLAMA_MODEL;
    const messages = constructOllamaMessages(taskData);
    const requestBody = { model: selectedModel, messages: messages, stream: false };
    
    try {
        const data = await fetchOllama(OLLAMA_CONFIG.chatEndpoint, requestBody);
        
        if (data.error) {
            throw new Error(`Ollama API error: ${data.error}`);
        }
        
        // Extract content from response
        let content = '';
        if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content.trim();
        } else if (data.message?.content) {
            content = data.message.content.trim();
        } else {
            throw new Error("Unexpected Ollama API response format.");
        }

        // Parse summary and description from the AI response
        let summary = '', description = '';

        // Look for explicitly marked summary and description
        // Using positive lookahead to ensure we don't capture the DESCRIPTION marker in the summary
        const summaryMatch = content.match(/SUMMARY:\s*(.*?)(?=\s*DESCRIPTION:|$)/s);
        const descriptionMatch = content.match(/DESCRIPTION:\s*([\s\S]*?)$/);

        if (summaryMatch && summaryMatch[1]) {
            // Clean up the summary - remove markdown and ensure it's a single line
            summary = summaryMatch[1]
                .replace(/[#*_~`\[\]]/g, '')  // Remove markdown characters including square brackets
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers but keep content
                .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers but keep content
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
                .replace(/\n/g, ' ')     // Replace newlines with spaces
                .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
                .trim();

            // Ensure summary is not too long (max 255 chars for Jira)
            if (summary.length > 255) {
                summary = summary.substring(0, 252) + '...';
            }
        }
        
        if (descriptionMatch && descriptionMatch[1]) {
            description = descriptionMatch[1]
                .trim()
                .replace(/^\n+|\n+$/g, '')  // Remove leading/trailing newlines
                // First clean up any existing Jira markup that might be in the text
                .replace(/h[1-6]\.\s+/g, '')  // Remove existing Jira header markers
                // Then format text for Jira's markup
                .replace(/^#{3}\s+(.*?)$/gm, 'h3. $1')  // h3 (do h3 first to avoid matching with h1)
                .replace(/^#{2}\s+(.*?)$/gm, 'h2. $1')  // h2
                .replace(/^#{1}\s+(.*?)$/gm, 'h1. $1')  // h1
                .replace(/\*\*(.*?)\*\*/g, '*$1*')   // bold
                .replace(/`([^`]+)`/g, '{{$1}}')     // inline code
                .replace(/```(\w*)\n([\s\S]*?)```/g, '{code:$1}\n$2\n{code}') // code blocks
                .replace(/^[-*]\s+(.*?)$/gm, '* $1')  // unordered lists (match both - and * bullets)
                .replace(/^\d+\.\s+(.*?)$/gm, '# $1')  // ordered lists (add space after dot)
                .replace(/\[(.*?)\]\((.*?)\)/g, '[$1|$2]')  // links
                .replace(/^\s*>\s*(.*?)$/gm, '{quote}$1{quote}'); // blockquotes
        }

        // Apply fallbacks if needed
        if (!summary && taskData.GenerateType === "both") {
            // For new issues, try to generate a summary from the first line of content
            const firstLine = content.split('\n')[0].trim();
            if (firstLine && firstLine.length <= 255) {
                summary = firstLine.replace(/[#*_~`]/g, '').trim();
            } else if (firstLine) {
                summary = firstLine.substring(0, 252) + '...';
            }
        }

        if (!description) {
            // If no DESCRIPTION marker found, use the entire content except the summary
            description = content.replace(/SUMMARY:.*?(\n|$)/s, '').trim();
        }

        // Final validation
        if (taskData.GenerateType === "both" && (!summary || !description)) {
            throw new Error("Failed to generate both summary and description from AI response.");
        }

        return { summary, description };
    } catch (error) {
        if (error.message.includes("Failed to fetch")) {
            throw new Error(`Network error: Could not connect to Ollama at ${OLLAMA_CONFIG.baseUrl}.`);
        }
        throw error;
    }
}

// --- Jira API Functions ---
async function fetchJiraInitialCreateMeta() {
    try {
        console.log("DEBUG: Starting fetchJiraInitialCreateMeta()");
        const { pat, jiraBaseUrl } = await getJiraCredentials();
        console.log("DEBUG: Got credentials. jiraBaseUrl:", jiraBaseUrl, "PAT length:", pat ? pat.length : 0);
        
        // Fetch all projects first
        const projectsUrl = `${jiraBaseUrl}/rest/api/2/project`;
        console.log("DEBUG: Fetching projects from:", projectsUrl);
        const projectsResponse = await fetch(projectsUrl, {
            headers: { "Authorization": `Bearer ${pat}`, "Accept": "application/json" }
        });
        
        if (!projectsResponse.ok) {
            const errorText = await projectsResponse.text();
            console.error("DEBUG: Project fetch failed:", projectsResponse.status, errorText);
            throw new Error(`Failed to fetch Jira projects: ${projectsResponse.status} ${errorText}`);
        }
        
        const projects = await projectsResponse.json();
        console.log("DEBUG: Projects fetched successfully. Count:", projects.length);
        
        // Fetch all priorities globally
        const prioritiesUrl = `${jiraBaseUrl}/rest/api/2/priority`;
        console.log("DEBUG: Fetching priorities from:", prioritiesUrl);
        const prioritiesResponse = await fetch(prioritiesUrl, {
            headers: { "Authorization": `Bearer ${pat}`, "Accept": "application/json" }
        });
        
        if (!prioritiesResponse.ok) {
            const errorText = await prioritiesResponse.text();
            console.error("DEBUG: Priorities fetch failed:", prioritiesResponse.status, errorText);
            throw new Error(`Failed to fetch Jira priorities: ${prioritiesResponse.status} ${errorText}`);
        }
        
        const priorities = await prioritiesResponse.json();
        console.log("DEBUG: Priorities fetched successfully. Count:", priorities.length);

        const result = { 
            projects: projects.map(p => ({ id: p.id, name: p.name, key: p.key })),
            // Issue types will be fetched per project
            priorities: priorities.map(p => ({ id: p.id, name: p.name }))
        };
        
        console.log("DEBUG: Returning metadata with", result.projects.length, "projects and", result.priorities.length, "priorities");
        return result;
    } catch (error) {
        console.error("DEBUG: Error in fetchJiraInitialCreateMeta:", error.message);
        throw error;
    }
}

async function fetchIssueTypesForProject(projectId) {
    const { pat, jiraBaseUrl } = await getJiraCredentials();
    const createmetaUrl = `${jiraBaseUrl}/rest/api/2/issue/createmeta?projectIds=${projectId}&expand=projects.issuetypes`;
    console.log("DEBUG: Fetching issue types for project:", projectId, "URL:", createmetaUrl);
    const response = await fetch(createmetaUrl, {
        headers: { "Authorization": `Bearer ${pat}`, "Accept": "application/json" }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("DEBUG: Failed to fetch issue types for project", projectId, response.status, errorText);
        throw new Error(`Failed to fetch issue types for project ${projectId}: ${response.status} ${errorText}`);
    }
    const createmeta = await response.json();
    if (createmeta.projects && createmeta.projects.length > 0 && createmeta.projects[0].issuetypes) {
        return createmeta.projects[0].issuetypes.map(it => ({ id: it.id, name: it.name, description: it.description, iconUrl: it.iconUrl }));
    }
    return []; // Return empty array if no issue types found for the project
}
async function createJiraIssueApi(issueData) {
    const { pat, jiraBaseUrl } = await getJiraCredentials();
    const payload = { fields: issueData }; // issueData from popup.js is already structured for fields
    
    console.log("DEBUG: Creating Jira issue with payload:", JSON.stringify(payload));

    const response = await fetch(`${jiraBaseUrl}/rest/api/2/issue`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${pat}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const responseBodyText = await response.text();
    console.log(`DEBUG: Create Jira issue API response status: ${response.status}, body: ${responseBodyText}`);

    if (!response.ok) {
        let errorMessage = `Failed to create Jira issue: ${response.status} ${response.statusText}.`;
        try {
            const errorJson = JSON.parse(responseBodyText);
            if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
                errorMessage += ` Details: ${errorJson.errorMessages.join(", ")}`;
            }
            if (errorJson.errors) {
                errorMessage += ` Errors: ${JSON.stringify(errorJson.errors)}`;
            }
        } catch (e) { /* Ignore parsing error, use original text */ }
        throw new Error(errorMessage);
    }
    const responseData = JSON.parse(responseBodyText);
    return { issueKey: responseData.key, issueId: responseData.id, self: responseData.self };
}

// --- Message Listener ---
try {
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("DEBUG: Background script received message:", request.action);

    if (request.action === "generateDescriptionPopup") {
        generateDescriptionFromApi(request.data)
            .then(result => sendResponse({ 
                success: true, 
                summary: result.summary,
                description: result.description 
            }))
            .catch(error => sendResponse({ success: false, error: `Generation Error: ${error.message}` }));
        return true; // Indicates asynchronous response
    
    } else if (request.action === "getJiraInitialCreateMeta") {
        fetchJiraInitialCreateMeta()
            .then(metaData => sendResponse({ success: true, data: metaData }))
            .catch(error => sendResponse({ success: false, error: `Failed to get Jira metadata: ${error.message}` }));
        return true; // Indicates asynchronous response
    
    } else if (request.action === "getIssueTypesForProject") {
        fetchIssueTypesForProject(request.projectId)
            .then(issueTypes => sendResponse({ success: true, data: issueTypes }))
            .catch(error => sendResponse({ success: false, error: `Failed to get issue types for project: ${error.message}` }));
        return true; // Indicates asynchronous response
    
    } else if (request.action === "createJiraIssue") {
        createJiraIssueApi(request.data)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: `Failed to create Jira issue: ${error.message}` }));
        return true; // Indicates asynchronous response
    }
    
    console.log("DEBUG: Background message action not recognized:", request.action);
    return false; 
});


} catch (addListenerError) {
    console.error("DEBUG: Failed to add runtime.onMessage listener:", addListenerError);
}

console.log("DEBUG: Background script initialized (Ollama Local - Model Selection - Jira Create Meta).");
