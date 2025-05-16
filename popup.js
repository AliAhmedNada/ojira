// popup.js - Logic for the ojira Assistant popup

console.log("DEBUG: Popup script loading...");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DEBUG: DOMContentLoaded event fired.");

    // --- UI Elements for Existing Issue Description Generation ---
    const statusText = document.getElementById("status-text");
    const loadingSpinner = document.getElementById("loading-spinner");
    const errorDiv = document.getElementById("error");
    const jiraSummaryDiv = document.getElementById("jira-summary");
    const jiraTypeDiv = document.getElementById("jira-type");
    const jiraAssigneeDiv = document.getElementById("jira-assignee");
    const jiraProjectDiv = document.getElementById("jira-project");
    const jiraDescriptionDiv = document.getElementById("jira-description");
    const jiraCommentsDiv = document.getElementById("jira-comments");
    const userInputTextArea = document.getElementById("user-input");
    const generateBtn = document.getElementById("generate-btn");
    const outputSection = document.getElementById("output-section");
    const outputArea = document.getElementById("output-area");
    const copyBtn = document.getElementById("copy-btn");
    const insertBtn = document.getElementById("insert-btn");
    const mainContent = document.getElementById("main-content"); 
    const jiraWarningDiv = document.getElementById("jira-warning");
    const refreshBtn = document.getElementById("refresh-btn");
    const exitBtn = document.getElementById("exit-btn");

    // --- UI Elements for Create New Jira Issue ---
    const toggleCreateNewBtn = document.getElementById("toggle-create-new-btn");
    const createNewItemSection = document.getElementById("create-new-item-section");
    const createProjectSelect = document.getElementById("create-project");
    const createIssueTypeSelect = document.getElementById("create-issue-type");
    const createSummaryInput = document.getElementById("create-summary");
    const createReporterInput = document.getElementById("create-reporter");
    const createAssigneeInput = document.getElementById("create-assignee");
    const createPrioritySelect = document.getElementById("create-priority");
    const createAiPromptTextarea = document.getElementById("create-ai-prompt");
    const createGenerateAiContentBtn = document.getElementById("create-generate-ai-content-btn");
    const createDescriptionTextarea = document.getElementById("create-description");
    const createIssueBtn = document.getElementById("create-issue-btn");
    const createItemStatusText = document.getElementById("create-item-status-text");
    const createItemLoadingSpinner = document.getElementById("create-item-loading-spinner");
    const createItemErrorDiv = document.getElementById("create-item-error");

    let fetchedJiraData = {};
    let targetTabId = null;
    let targetTabUrl = null;
    let isJiraPage = false; 
    let createFormMetadataLoaded = false;

    // --- Helper Functions for UI State (Existing Issue) ---
    function showLoading(isLoading, message = "") {
        if (isLoading) {
            if (statusText) statusText.textContent = message;
            if (loadingSpinner) loadingSpinner.classList.remove("hidden");
            if (generateBtn) generateBtn.disabled = true;
            if (insertBtn) insertBtn.disabled = true;
        } else {
            if (statusText) statusText.textContent = message;
            if (loadingSpinner) loadingSpinner.classList.add("hidden");
            if (generateBtn) generateBtn.disabled = false;
            if (insertBtn) insertBtn.disabled = false;
        }
    }

    function showStatus(message, isLoading = false) {
        console.log("DEBUG: showStatus -", message, "isLoading:", isLoading);
        clearError();
        showLoading(isLoading, message);
    }

    function showError(message) {
        console.error("DEBUG: showError -", message);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove("hidden");
        }
        if (statusText) statusText.textContent = "";
        if (loadingSpinner) loadingSpinner.classList.add("hidden");
        if (generateBtn) generateBtn.disabled = false;
        if (insertBtn) insertBtn.disabled = false;
    }
    
    function clearError() {
        if (errorDiv) {
            errorDiv.textContent = "";
            errorDiv.classList.add("hidden");
        }
    }

    function clearMessages() {
        console.log("DEBUG: clearMessages called.");
        if (statusText) statusText.textContent = "";
        if (loadingSpinner) loadingSpinner.classList.add("hidden");
        clearError();
    }

    function displayFetchedData(data) {
        console.log("DEBUG: Displaying fetched data:", data);
        fetchedJiraData = data; 
        if (jiraSummaryDiv) jiraSummaryDiv.innerHTML = data.Summary || "<span class=\"fetching\">(Not found)</span>";
        if (jiraTypeDiv) jiraTypeDiv.innerHTML = data.Type || "<span class=\"fetching\">(Not found)</span>";
        if (jiraAssigneeDiv) jiraAssigneeDiv.innerHTML = data.Assignee || "<span class=\"fetching\">(Not found)</span>";
        if (jiraProjectDiv) jiraProjectDiv.innerHTML = data.Project || "<span class=\"fetching\">(Not found)</span>";
        
        let displayDescription = "<span class=\"fetching\">(None)</span>";
        if (data.Description) {
            displayDescription = data.Description.length > 200 ? data.Description.substring(0, 200) + "..." : data.Description;
        }
        if (jiraDescriptionDiv) jiraDescriptionDiv.innerHTML = displayDescription;
        if (jiraCommentsDiv) jiraCommentsDiv.innerHTML = data.Comments || "<span class=\"fetching\">(None)</span>";
    }

    function showJiraWarning() {
        console.log("DEBUG: Showing non-Jira page warning.");
        if (mainContent) mainContent.classList.add("hidden");
        if (jiraWarningDiv) jiraWarningDiv.classList.remove("hidden");
        if (jiraWarningDiv) jiraWarningDiv.textContent = "Please Open Jira Page to Generate Description for an Existing Issue, or use 'Create New Jira Issue +' above.";
        clearMessages();
    }

    function showAppContent() {
        console.log("DEBUG: Showing main application content for existing issues.");
        if (mainContent) mainContent.classList.remove("hidden");
        if (jiraWarningDiv) jiraWarningDiv.classList.add("hidden");
    }

    // --- Helper Functions for UI State (Create New Issue) ---
    function showCreateItemLoading(isLoading, message = "", isGenerateAction = false) {
        const generateContentSpinner = document.getElementById("generate-content-spinner");
        if (isLoading) {
            if (createItemStatusText) createItemStatusText.textContent = message;
            if (isGenerateAction) {
                if (generateContentSpinner) generateContentSpinner.classList.remove("hidden");
                if (createGenerateAiContentBtn) createGenerateAiContentBtn.disabled = true;
            } else {
                if (createItemLoadingSpinner) createItemLoadingSpinner.classList.remove("hidden");
                if (createIssueBtn) createIssueBtn.disabled = true;
            }
        } else {
            if (createItemStatusText) createItemStatusText.textContent = message;
            if (isGenerateAction) {
                if (generateContentSpinner) generateContentSpinner.classList.add("hidden");
                if (createGenerateAiContentBtn) createGenerateAiContentBtn.disabled = false;
            } else {
                if (createItemLoadingSpinner) createItemLoadingSpinner.classList.add("hidden");
                if (createIssueBtn) createIssueBtn.disabled = false;
            }
        }
    }

    function showCreateItemStatus(message, isLoading = false, isGenerateAction = false) {
        console.log("DEBUG: showCreateItemStatus -", message, "isLoading:", isLoading, "isGenerateAction:", isGenerateAction);
        clearCreateItemError();
        showCreateItemLoading(isLoading, message, isGenerateAction);
    }

    function showCreateItemError(message) {
        console.error("DEBUG: showCreateItemError -", message);
        if (createItemErrorDiv) {
            createItemErrorDiv.textContent = message;
            createItemErrorDiv.classList.remove("hidden");
        }
        if (createItemStatusText) createItemStatusText.textContent = "";
        if (createItemLoadingSpinner) createItemLoadingSpinner.classList.add("hidden");
        if (createGenerateAiContentBtn) createGenerateAiContentBtn.disabled = false;
        if (createIssueBtn) createIssueBtn.disabled = false;
    }

    function clearCreateItemError() {
        if (createItemErrorDiv) {
            createItemErrorDiv.textContent = "";
            createItemErrorDiv.classList.add("hidden");
        }
    }

    // --- Content Script Communication ---
    async function ensureContentScriptAndSendMessage(tabIdToUse, messagePayload, callback) {
        try {
            const tab = await chrome.tabs.get(tabIdToUse).catch(() => null);
            if (!tab) {
                const errorMessage = `Target Jira tab (ID: ${tabIdToUse}) may have been closed or changed. Please refresh the extension.`;
                showError(errorMessage);
                if (messagePayload.action === "getJiraData") showJiraWarning();
                return;
            }

            console.log(`DEBUG: Ensuring content script for action '${messagePayload.action}' in tab ${tabIdToUse}`);
            await chrome.scripting.executeScript({
                target: { tabId: tabIdToUse },
                files: ["content_script.js"],
            });
            console.log(`DEBUG: Content script ensured/re-injected for action '${messagePayload.action}'. Sending message.`);
            
            chrome.tabs.sendMessage(tabIdToUse, messagePayload, callback);

        } catch (error) {
            console.error(`DEBUG: Error in ensureContentScriptAndSendMessage for action '${messagePayload.action}':`, error);
            const errorMessage = `Failed to connect with the Jira page for action '${messagePayload.action}'. Error: ${error.message}. Try refreshing the extension.`;
            showError(errorMessage);
            if (messagePayload.action === "getJiraData") showJiraWarning();
        }
    }

    // --- Initialization for Existing Issue Section ---
    function initializeExistingIssueSection() {
        console.log("DEBUG: Starting initial load / refresh for existing issue section.");
        showStatus("Initializing...", true);

        const jiraKeywords = ["atlassian", "jira", "jiraprod"];
        const isUrlPotentiallyJira = targetTabUrl && jiraKeywords.some(keyword => targetTabUrl.includes(keyword));

        if (isUrlPotentiallyJira) {
            console.log("DEBUG: URL indicates a Jira page. Initializing main UI for existing issue.");
            isJiraPage = true; 
            showAppContent();
            showStatus("Fetching Jira data...", true);
            ensureContentScriptAndSendMessage(targetTabId, { action: "getJiraData" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("DEBUG: Error receiving Jira data response:", chrome.runtime.lastError.message);
                    isJiraPage = false;
                    showJiraWarning();
                    showError("Failed to communicate with Jira page for data. It might have been closed, navigated away, or the content script failed. Please try refreshing the extension on the Jira page.");
                    return;
                }
                if (response && response.success) {
                    console.log("DEBUG: Successfully received Jira data.");
                    isJiraPage = true;
                    displayFetchedData(response.data);
                    showStatus("Jira data loaded. Ready to generate.");
                } else {
                    console.warn("DEBUG: Content script failed to get Jira data:", response?.error);
                    isJiraPage = false;
                    showJiraWarning();
                    showError(response?.error || "Could not retrieve data from this page. Is it a Jira issue page?");
                }
            });
        } else {
            console.log("DEBUG: URL does not indicate a Jira page for existing issue section.");
            isJiraPage = false;
            showJiraWarning();
        }
    }

    // --- Initialization for Create New Issue Section ---
    function populateDropdown(selectElement, options, defaultText = "Select an option") {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">${defaultText}</option>`; // Clear existing and add default
        selectElement.disabled = false; // Always ensure dropdown is enabled when populating
        
        if (options && Array.isArray(options)) {
            options.forEach(option => {
                const opt = document.createElement("option");
                opt.value = option.id;
                opt.textContent = option.name;
                selectElement.appendChild(opt);
            });
        } else {
            console.warn("DEBUG: populateDropdown received invalid options:", options);
        }
    }

    async function loadCreateFormMetadata() {
        if (createFormMetadataLoaded && createProjectSelect && createProjectSelect.options.length > 1) { // Check if projects already loaded
            // This function is primarily for initial load, project change handles issue types.
            // Make sure dropdowns are enabled
            if(createProjectSelect) createProjectSelect.disabled = false;
            return;
        }
        console.log("DEBUG: Loading initial metadata for create new issue form (projects & priorities).");
        showCreateItemStatus("Loading projects & priorities...", true);
        // Do not disable the dropdowns initially
        if(createIssueTypeSelect) createIssueTypeSelect.disabled = true; // Only disable issue type until project is selected

        // First, check if Jira credentials are configured
        chrome.storage.sync.get(["jiraPat", "jiraUrl"], (credResult) => {
            if (!credResult.jiraPat || !credResult.jiraUrl) {
                let missingItems = [];
                if (!credResult.jiraUrl) missingItems.push("Jira URL");
                if (!credResult.jiraPat) missingItems.push("Personal Access Token (PAT)");
                
                const errorMsg = `Cannot load projects: Missing ${missingItems.join(" and ")}. Please configure in Options.`;
                console.error("DEBUG: " + errorMsg);
                showCreateItemError(errorMsg);
                
                // Add option to go to options page
                const optionsBtn = document.createElement("button");
                optionsBtn.textContent = "Open Options Page";
                optionsBtn.className = "btn btn-primary mt-2";
                optionsBtn.onclick = () => chrome.runtime.openOptionsPage();
                
                if (createItemErrorDiv) {
                    createItemErrorDiv.appendChild(document.createElement("br"));
                    createItemErrorDiv.appendChild(optionsBtn);
                }
                
                return;
            }
            
            // Credentials exist, proceed with API call
            chrome.runtime.sendMessage({ action: "getJiraInitialCreateMeta" }, (response) => { // Changed action name
                if (chrome.runtime.lastError) {
                    const errorMsg = `Error fetching Jira initial metadata: ${chrome.runtime.lastError.message}. Ensure Jira URL and PAT are set in options.`;
                    console.error("DEBUG: " + errorMsg);
                    showCreateItemError(errorMsg);
                    if(createProjectSelect) createProjectSelect.disabled = false;
                    return;
                }
                if (response && response.success) {
                    console.log("DEBUG: Received Jira initial create metadata:", response.data);
                    let projectsAvailable = false;
                    if (response.data.projects && response.data.projects.length > 0) {
                        populateDropdown(createProjectSelect, response.data.projects, "Select Project");
                        if(createProjectSelect) createProjectSelect.disabled = false;
                        projectsAvailable = true;
                    } else {
                        populateDropdown(createProjectSelect, [], "No projects found");
                        if(createProjectSelect) createProjectSelect.disabled = false; // Keep enabled to show message
                        showCreateItemError("No projects found for your account. Please check your Jira project permissions or ensure the correct Jira URL is configured.");
                    }

                    if (response.data.priorities && response.data.priorities.length > 0) {
                        populateDropdown(createPrioritySelect, response.data.priorities, "Select Priority");
                    } else {
                        populateDropdown(createPrioritySelect, [], "No priorities found");
                        console.warn("DEBUG: No priorities found during initial metadata load. This might be normal depending on Jira setup.");
                    }

                    if (projectsAvailable) {
                        showCreateItemStatus("Select a project to load issue types.");
                    } else {
                        // Error for no projects is already shown by showCreateItemError
                        // If priorities were also critical and missing, a similar error could be shown here or above.
                    }
                    createFormMetadataLoaded = true; 
                } else {
                    const errorMsg = `Failed to load Jira initial metadata: ${response?.error || "Unknown error"}. Check Jira URL/PAT in options.`;
                    console.error("DEBUG: " + errorMsg);
                    showCreateItemError(errorMsg);
                    if(createProjectSelect) createProjectSelect.disabled = false;
                    
                    // Add option to go to options page
                    const optionsBtn = document.createElement("button");
                    optionsBtn.textContent = "Open Options Page";
                    optionsBtn.className = "btn btn-primary mt-2";
                    optionsBtn.onclick = () => chrome.runtime.openOptionsPage();
                    
                    if (createItemErrorDiv) {
                        createItemErrorDiv.appendChild(document.createElement("br"));
                        createItemErrorDiv.appendChild(optionsBtn);
                    }
                }
            });
        });
    }

    // Event listener for project selection to load issue types
    if (createProjectSelect) {
        createProjectSelect.addEventListener("change", () => {
            const projectId = createProjectSelect.value;
            populateDropdown(createIssueTypeSelect, [], "Select Project First"); // Clear previous issue types
            if(createIssueTypeSelect) createIssueTypeSelect.disabled = true;

            if (projectId) {
                console.log("DEBUG: Project selected, fetching issue types for project ID:", projectId);
                showCreateItemStatus("Loading issue types...", true);
                populateDropdown(createIssueTypeSelect, [], "Loading Issue Types..."); // Placeholder

                chrome.runtime.sendMessage({ action: "getIssueTypesForProject", projectId: projectId }, (response) => {
                    if (chrome.runtime.lastError) {
                        showCreateItemError(`Error fetching issue types: ${chrome.runtime.lastError.message}`);
                        populateDropdown(createIssueTypeSelect, [], "Error loading types");
                        if(createIssueTypeSelect) createIssueTypeSelect.disabled = false; // Enable even on error to allow re-try or manual input if needed
                        return;
                    }
                    if (response && response.success) {
                        console.log("DEBUG: Received issue types for project:", response.data);
                        if (response.data && response.data.length > 0) {
                            populateDropdown(createIssueTypeSelect, response.data, "Select Issue Type");
                            showCreateItemStatus("Issue types loaded. Ready to create issue.");
                        } else {
                            populateDropdown(createIssueTypeSelect, [], "No issue types for project");
                            showCreateItemStatus("No issue types found for the selected project.");
                        }
                        if(createIssueTypeSelect) createIssueTypeSelect.disabled = false;
                    } else {
                        showCreateItemError(`Failed to load issue types for project: ${response?.error || "Unknown error"}`);
                        populateDropdown(createIssueTypeSelect, [], "Error - Select Project");
                        if(createIssueTypeSelect) createIssueTypeSelect.disabled = false;
                    }
                });
            } else {
                showCreateItemStatus("Select a project to load issue types.");
            }
        });
    }
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            console.log("DEBUG: Refresh button clicked.");
            if (outputArea) outputArea.value = ""; 
            if (outputSection) outputSection.classList.add("hidden");
            // Only re-initialize existing issue section if it's the active view
            if (createNewItemSection.classList.contains("hidden")) {
                 initializeExistingIssueSection(); 
            }
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener("click", () => {
            console.log("DEBUG: Exit button clicked.");
            window.close();
        });
    }

    if (toggleCreateNewBtn) {
        toggleCreateNewBtn.addEventListener("click", () => {
            console.log("DEBUG: Toggle view button clicked.");
            const isCreateSectionCurrentlyVisible = !createNewItemSection.classList.contains("hidden");

            if (isCreateSectionCurrentlyVisible) {
                // Switch from Create View to Existing View
                createNewItemSection.classList.add("hidden");
                toggleCreateNewBtn.textContent = "Create New Jira Issue +";

                // Show appropriate part of existing issue view
                if (isJiraPage) { 
                    showAppContent(); 
                } else {
                    showJiraWarning(); 
                }
            } else {
                // Switch from Existing View to Create View
                createNewItemSection.classList.remove("hidden");
                toggleCreateNewBtn.textContent = "View/Edit Existing Issue";

                // Hide both parts of existing issue view
                if (mainContent) mainContent.classList.add("hidden");
                if (jiraWarningDiv) jiraWarningDiv.classList.add("hidden");
                
                // Always ensure project select is enabled when switching to create view
                if (createProjectSelect) createProjectSelect.disabled = false;
                
                // Load metadata if not already loaded
                if (!createFormMetadataLoaded) {
                    loadCreateFormMetadata();
                }
            }
        });
    }

    if (generateBtn) { // For existing issues
        generateBtn.addEventListener("click", () => {
            console.log("DEBUG: Generate button (for existing issue) clicked.");
            clearMessages();
            const userInput = userInputTextArea.value.trim();

            if (!isJiraPage || !targetTabId) {
                showError("Cannot generate. Please ensure you are on a Jira issue page and data has loaded.");
                return;
            }
            if (!fetchedJiraData || !Object.keys(fetchedJiraData).length === 0 || !fetchedJiraData.Summary) {
                 showError("Jira data not loaded yet or incomplete. Cannot generate. Try refreshing.");
                 return;
            }

            const promptContent = {
                Summary: fetchedJiraData.Summary || "",
                Project: fetchedJiraData.Project || "",
                Type: fetchedJiraData.Type || "",
                Assignee: fetchedJiraData.Assignee || "",
                CurrentDescription: fetchedJiraData.Description || "",
                Comments: fetchedJiraData.Comments || "",
                Instructions: userInput
            };
            
            showStatus("Generating description with Ollama...", true);
            chrome.runtime.sendMessage({ action: "generateDescriptionPopup", data: promptContent }, (response) => {
                if (chrome.runtime.lastError) {
                    showError("Error communicating with background: " + chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.success) {
                    if (outputArea) outputArea.value = response.description;
                    if (outputSection) outputSection.classList.remove("hidden");
                    showStatus("Description generated!");
                } else {
                    showError(response?.error || "Failed to generate description.");
                }
            });
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            if (outputArea && outputArea.value) {
                navigator.clipboard.writeText(outputArea.value)
                    .then(() => showStatus("Copied to clipboard!"))
                    .catch(err => showError("Failed to copy: " + err));
            } else {
                showError("Nothing to copy.");
            }
        });
    }

    if (insertBtn) {
        insertBtn.addEventListener("click", () => {
            const descriptionToInsert = outputArea.value;
            if (!descriptionToInsert) {
                showError("No description to insert.");
                return;
            }
            if (!isJiraPage || !targetTabId) {
                showError("Cannot insert. Not on a Jira page or tab ID is missing.");
                return;
            }
            showStatus("Inserting description into Jira...", true);
            ensureContentScriptAndSendMessage(targetTabId, { action: "insertDescription", description: descriptionToInsert }, (response) => {
                if (chrome.runtime.lastError) {
                    showError("Error communicating for insertion: " + chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.success) {
                    showStatus("Description inserted successfully! Page will refresh.");
                } else {
                    showError(response?.error || "Failed to insert description.");
                }
            });
        });
    }

    // --- Create New Issue Event Listeners ---
    if (createGenerateAiContentBtn) {
        createGenerateAiContentBtn.addEventListener("click", () => {
            console.log("DEBUG: Create Generate AI Content button clicked.");
            const userPrompt = createAiPromptTextarea.value.trim();

            if (!userPrompt) {
                showCreateItemError("Please enter a prompt to generate content.");
                return;
            }

            // Show loading spinner and disable button
            showCreateItemStatus("Generating summary and description with AI...", true, true); // Added true for isGenerateAction

            const promptContent = {
                Instructions: userPrompt,
                Project: createProjectSelect.options[createProjectSelect.selectedIndex]?.text || "",
                Type: createIssueTypeSelect.options[createIssueTypeSelect.selectedIndex]?.text || "",
                GenerateType: "both" // Indicate we want both summary and description
            };

            chrome.runtime.sendMessage({ action: "generateDescriptionPopup", data: promptContent }, (response) => {
                if (chrome.runtime.lastError) {
                    showCreateItemError("Error communicating with background: " + chrome.runtime.lastError.message);
                    showCreateItemStatus("", false, true); // Hide loading for generate action
                    return;
                }
                
                if (response && response.success) {
                    if (response.summary) {
                        createSummaryInput.value = response.summary;
                    }
                    if (response.description) {
                        createDescriptionTextarea.value = response.description;
                    }
                    showCreateItemStatus("Content generated successfully!", false, true); // Hide loading for generate action
                    if (createIssueBtn) createIssueBtn.classList.remove("hidden");
                } else {
                    showCreateItemError(response?.error || "Failed to generate content.");
                    showCreateItemStatus("", false, true); // Hide loading for generate action
                    if (createIssueBtn) createIssueBtn.classList.add("hidden");
                }
            });
        });
    }

    // Add event listener for the description textarea to hide the create button if cleared
    if (createDescriptionTextarea && createIssueBtn) {
        createDescriptionTextarea.addEventListener("input", () => {
            if (createDescriptionTextarea.value.trim() === "") {
                createIssueBtn.classList.add("hidden");
            }
            // NOTE: Do not add an 'else' to show the button here.
            // The button is only shown upon successful AI generation.
        });
    }

    if (createIssueBtn) {
        createIssueBtn.addEventListener("click", async () => {
            const projectVal = createProjectSelect.value;
            const issueTypeVal = createIssueTypeSelect.value;
            const summaryVal = createSummaryInput.value.trim();
            const descriptionVal = createDescriptionTextarea.value.trim();
            const reporterVal = createReporterInput.value.trim();
            const assigneeVal = createAssigneeInput.value.trim();
            const priorityVal = createPrioritySelect.value;

            if (!projectVal || !issueTypeVal || !summaryVal || !descriptionVal) {
                showCreateItemError("Project, Issue Type, Summary, and Description are required.");
                return;
            }

            const issueData = {
                project: { id: projectVal },
                issuetype: { id: issueTypeVal },
                summary: summaryVal,
                description: descriptionVal,
            };
            if (reporterVal) issueData.reporter = { name: reporterVal }; 
            if (assigneeVal) issueData.assignee = { name: assigneeVal };
            if (priorityVal) issueData.priority = { id: priorityVal };

            // Disable button and show loading indicator
            createIssueBtn.disabled = true;
            showCreateItemStatus("Creating issue in Jira...", true);

            chrome.runtime.sendMessage({ action: "createJiraIssue", data: issueData }, (response) => {
                if (chrome.runtime.lastError) {
                    showCreateItemError("Error communicating with background: " + chrome.runtime.lastError.message);
                    createIssueBtn.disabled = false;
                    return;
                }
                if (response && response.success) {
                    showCreateItemStatus(`Issue ${response.issueKey} created successfully!`);
                    // Optionally clear form or provide link
                } else {
                    showCreateItemError(response?.error || "Failed to create issue.");
                    createIssueBtn.disabled = false;
                }
            });
        });
    }

    // --- Initial Popup Load ---
    const urlParams = new URLSearchParams(window.location.search);
    targetTabId = parseInt(urlParams.get("tabId"));
    targetTabUrl = urlParams.get("tabUrl");
    const errorParam = urlParams.get("error");

    // Make sure project select is always enabled
    if (createProjectSelect) createProjectSelect.disabled = false;
    
    // Failsafe: Add a delayed check to ensure project select is enabled
    setTimeout(() => {
        if (createProjectSelect && createProjectSelect.disabled) {
            console.log("DEBUG: Enabling project select as failsafe");
            createProjectSelect.disabled = false;
        }
    }, 2000);

    if (errorParam) {
        showError(`Could not determine active tab: ${errorParam}. Please ensure a Jira page is active and try again.`);
        showJiraWarning();
        isJiraPage = false;
    } else if (targetTabId && targetTabUrl) {
        // Default to existing issue view
        createNewItemSection.classList.add("hidden");
        toggleCreateNewBtn.textContent = "Create New Jira Issue +";
        initializeExistingIssueSection();
    } else {
        showError("Could not get target tab information. Please try again.");
        showJiraWarning();
        isJiraPage = false;
    }
});

