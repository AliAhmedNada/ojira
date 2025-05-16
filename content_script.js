// Content script for Jira AI Description Generator (NIM Service Version)
// Extracts Jira task data and inserts generated descriptions using Jira REST API.

console.log("DEBUG: Content script loading (NIM Service Version - API v2 Plain Text Test - Desc Fix Attempt - Auto Refresh - PAT from Storage - Desc Selector Update)...");

// Function to gather specific Jira task data
function getTaskData() {
    console.log("DEBUG: getTaskData() called.");
    const data = {
        Summary: "",
        Description: "", 
        Assignee: "",
        Type: "",
        Project: "",
        Comments: "",
        IssueKey: ""
    };

    try {
        const pathParts = window.location.pathname.split("/");
        const browseIndex = pathParts.indexOf("browse");
        if (browseIndex !== -1 && pathParts.length > browseIndex + 1) {
            data.IssueKey = pathParts[browseIndex + 1];
            console.log("DEBUG: Issue Key found:", data.IssueKey);
        } else {
            console.warn("DEBUG: Could not extract Issue Key from URL:", window.location.pathname);
        }

        data.Summary = document.querySelector("h1[data-testid=\'issue.views.issue-base.foundation.summary.heading\']")?.textContent?.trim()
                       || document.querySelector("h1[data-test-id*=\'summary\']")?.textContent?.trim()
                       || document.getElementById("summary-val")?.textContent?.trim()
                       || document.querySelector("input#summary")?.value?.trim()
                       || "";
        console.log("DEBUG: Summary found:", data.Summary);

        data.Type = document.querySelector("[data-testid=\'issue.views.issue-base.foundation.change-issue-type.tooltip--trigger\'] img")?.alt?.trim()
                    || document.querySelector("#issuetype-val img")?.alt?.trim()
                    || document.querySelector("[data-field-id=\'issuetype\'] .single-select")?.textContent?.trim()
                    || document.querySelector("[data-test-id*=\'issuetype\']")?.textContent?.trim()
                    || "";
        console.log("DEBUG: Type found:", data.Type);

        data.Assignee = document.querySelector("[data-testid=\'issue.views.field.user.assignee\'] [data-testid=\'profilecard-next.ui.profilecard.profilecard-trigger\'] span > span")?.textContent?.trim()
                      || "Unassigned";
        console.log("DEBUG: Assignee found:", data.Assignee);

        data.Project = document.querySelector("[data-testid=\'issue.views.issue-base.foundation.breadcrumbs.breadcrumb-project-name\']")?.textContent?.trim()
                     || document.querySelector("#project-name-val")?.textContent?.trim()
                     || document.querySelector("[data-testid*=\'project-name\'] a")?.textContent?.trim()
                     || (data.IssueKey ? data.IssueKey.split("-")[0] : "")
                     || "";
        console.log("DEBUG: Project found:", data.Project);

        // Enhanced description fetching logic - Prioritizing selectors based on common Jira structures and potential user HTML
        let descriptionText = "";

        // Attempt 1: Selector based on common structure found in user-provided HTML (hypothetical based on analysis)
        // This selector should be the one identified from sourcepage.html. For example:
        // const specificUserSelector = document.querySelector("#descriptionmodule .mod-content .user-content-block");
        // For now, let's assume a common modern Jira selector might be the primary target if the previous one wasn't specific enough.
        // Let's refine the existing modern UI selector as the first primary attempt.
        const descriptionContainerModern = document.querySelector("[data-testid='issue.views.field.rich-text.description']");
        if (descriptionContainerModern) {
            const rendererDocument = descriptionContainerModern.querySelector(".ak-renderer-document");
            if (rendererDocument) {
                descriptionText = rendererDocument.textContent?.trim();
            }
            // Try ProseMirror if rendererDocument fails (common in edit mode)
            if (!descriptionText) {
                const proseMirror = descriptionContainerModern.querySelector(".ProseMirror");
                if (proseMirror) {
                    descriptionText = proseMirror.textContent?.trim();
                }
            }
            // Fallback to the container's text content if specific children don't yield text
            if (!descriptionText) {
                descriptionText = descriptionContainerModern.textContent?.trim();
            }
        }
        console.log("DEBUG: Description after modern selector attempt:", descriptionText ? descriptionText.substring(0,50) + "..." : "(empty)");

        // Attempt 2: Classic Jira view selector (often #description-val .wiki-content or similar)
        if (!descriptionText) {
            const classicDescriptionContainer = document.getElementById("description-val");
            if (classicDescriptionContainer) {
                // Try a more specific child first, like .wiki-content or .field-content
                const wikiContent = classicDescriptionContainer.querySelector(".wiki-content");
                if (wikiContent) {
                    descriptionText = wikiContent.textContent?.trim();
                }
                if (!descriptionText) {
                    const fieldContent = classicDescriptionContainer.querySelector(".field-content"); // Adding this based on thought process
                    if (fieldContent) {
                        descriptionText = fieldContent.textContent?.trim();
                    }
                }
                // Fallback to the #description-val container's direct text content if specific children fail
                if (!descriptionText) {
                    descriptionText = classicDescriptionContainer.textContent?.trim(); 
                }
            }
        }
        console.log("DEBUG: Description after classic selector attempt:", descriptionText ? descriptionText.substring(0,50) + "..." : "(empty)");

        // Attempt 3: Another older/alternative selector
        if (!descriptionText) {
            const altDescriptionRenderer = document.querySelector("[data-field-id='description'] .ak-renderer");
            if (altDescriptionRenderer) {
                descriptionText = altDescriptionRenderer.textContent?.trim();
            }
        }
        console.log("DEBUG: Description after alt ak-renderer selector attempt:", descriptionText ? descriptionText.substring(0,50) + "..." : "(empty)");

        // Attempt 4: Textarea for description (edit mode)
        if (!descriptionText) {
            const descriptionTextarea = document.querySelector("textarea#description");
            if (descriptionTextarea) {
                descriptionText = descriptionTextarea.value?.trim();
            }
        }
        console.log("DEBUG: Description after textarea selector attempt:", descriptionText ? descriptionText.substring(0,50) + "..." : "(empty)");

        data.Description = descriptionText || ""; // Ensure it's always a string

        console.log("DEBUG: Final Current Description found (length):", data.Description.length);
        if (data.Description.length > 0 && data.Description.length < 200) {
             console.log("DEBUG: Final Current Description content:", data.Description);
        } else if (data.Description.length >= 200) {
            console.log("DEBUG: Final Current Description content (first 200 chars):", data.Description.substring(0,200) + "...");
        }

        const comments = [];
        const commentElements = document.querySelectorAll("div[data-testid^='issue-comment-base.ui.comment.ak-comment.']");
        const lastTwoComments = Array.from(commentElements).slice(-2);
        lastTwoComments.forEach((commentEl, index) => {
            const author = commentEl.querySelector("[data-testid='profilecard-next.ui.profilecard.profilecard-trigger'] > span[role='presentation']")?.textContent?.trim() || "Unknown Author";
            const contentElement = commentEl.querySelector(".ak-renderer-document");
            const text = contentElement?.textContent?.trim() || "";
            if (text) comments.push(`Comment ${index + 1} by ${author}:\n${text}`);
        });
        data.Comments = comments.join("\n\n---\n\n");
        console.log("DEBUG: Comments found:", data.Comments);

        console.log("DEBUG: Final gathered task data:", data);
        return data;

    } catch (error) {
        console.error("DEBUG: Error occurred within getTaskData():", error);
        throw error;
    }
}

try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("DEBUG: Content script received message:", request, "from sender:", sender);

        if (request.action === "getJiraData") {
            console.log("DEBUG: Handling getJiraData request.");
            try {
                const taskData = getTaskData();
                if (taskData.IssueKey && (taskData.Summary || taskData.Description || taskData.Assignee !== "Unassigned")) {
                    console.log("DEBUG: Sending success response with data:", taskData);
                    sendResponse({ success: true, data: taskData });
                } else {
                    let errorMsg = "Could not find key Jira data on this page.";
                    if (!taskData.IssueKey) errorMsg = "Could not determine Jira Issue Key from URL.";
                    console.warn("DEBUG: No significant Jira task data found or IssueKey missing. Sending failure response.", taskData);
                    sendResponse({ success: false, error: `DEBUG: ${errorMsg} Are you on an issue view/edit screen?` });
                }
            } catch (error) {
                console.error("DEBUG: Error gathering Jira data in message listener:", error);
                sendResponse({ success: false, error: `DEBUG: Error gathering data: ${error.message}` });
            }
            return true; 
        }

        if (request.action === "insertDescription") {
            console.log("DEBUG: Handling insertDescription request with text:", request.text);
            const issueKey = getTaskData().IssueKey;
            const newDescriptionText = request.description || request.text; // Support both description and text for backward compatibility

            if (!issueKey) {
                console.error("DEBUG: Issue Key not available for inserting description.");
                sendResponse({ success: false, error: "DEBUG: Could not determine Issue Key to update description." });
                return true;
            }

            chrome.storage.sync.get(["jiraPat", "jiraUrl"], (result) => {
                const jiraPat = result.jiraPat;
                const jiraBaseUrl = result.jiraUrl;
                if (!jiraPat) {
                    console.error("DEBUG: Jira PAT not found in storage.");
                    sendResponse({ success: false, error: "DEBUG: Jira PAT not configured. Please set it in the extension options." });
                    return;
                }
                if (!jiraBaseUrl) {
                    console.error("DEBUG: Jira URL not found in storage.");
                    sendResponse({ success: false, error: "DEBUG: Jira URL not configured. Please set it in the extension options." });
                    return;
                }

                const apiUrl = `${jiraBaseUrl}/rest/api/2/issue/${issueKey}`; 
                console.log(`DEBUG: Attempting to update description for ${issueKey} via API v2: ${apiUrl} using PAT from storage with PLAIN TEXT.`);
                console.log("DEBUG: Plain Text Payload for description:", newDescriptionText);

                fetch(apiUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${jiraPat}`
                    },
                    body: JSON.stringify({
                        fields: {
                            description: newDescriptionText 
                        }
                    })
                })
                .then(async response => {
                    console.log(`DEBUG: API response status for PUT ${apiUrl}: ${response.status} ${response.statusText}`);
                    const responseBodyText = await response.text();
                    console.log("DEBUG: Jira API Response Body Text:", responseBodyText);

                    if (!response.ok) {
                        let errorDetails;
                        try {
                            const errorJson = JSON.parse(responseBodyText);
                            errorDetails = errorJson.errorMessages ? errorJson.errorMessages.join(", ") : responseBodyText;
                        } catch (_) {
                            errorDetails = responseBodyText;
                        }
                        console.error(`DEBUG: Jira API Error ${response.status}:`, errorDetails);
                        throw new Error(`Failed to update description. Status: ${response.status}. Details: ${errorDetails}`);
                    }
                    
                    console.log("DEBUG: Successfully updated description via Jira API v2.");
                    sendResponse({ success: true });

                    // Wait longer before refreshing to ensure the API change is propagated
                    setTimeout(() => { 
                        console.log("DEBUG: Refreshing page to show updated description...");
                        window.location.reload();
                    }, 1000); // Increased to 1 second
                })
                .catch(error => {
                    console.error("DEBUG: Error inserting description via Jira API v2:", error);
                    sendResponse({ success: false, error: `DEBUG: ${error.message}` });
                });
            });
            return true; 
        }

        console.log("DEBUG: Message action not recognized or handled:", request.action);
        return false; 
    });
} catch (addListenerError) {
    console.error("DEBUG: Failed to add runtime.onMessage listener in content script:", addListenerError);
}

console.log("DEBUG: Content script initialized and listener added (NIM Service Version - API v2 Plain Text Test - Desc Fix Attempt - Auto Refresh - PAT from Storage - Desc Selector Update).");


