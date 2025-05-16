document.addEventListener("DOMContentLoaded", () => {
    // PAT Management Elements
    const patInput = document.getElementById("pat-input");
    const toggleVisibilityBtn = document.getElementById("toggle-visibility-btn");
    const savePatBtn = document.getElementById("save-pat-btn");
    const clearPatBtn = document.getElementById("clear-pat-btn");
    const patStatusMessage = document.getElementById("pat-status-message");

    // Jira URL Management Elements
    const jiraUrlInput = document.getElementById("jira-url-input");
    const saveJiraUrlBtn = document.getElementById("save-jira-url-btn");
    const jiraUrlStatusMessage = document.getElementById("jira-url-status-message");

    // Ollama Model Selection Elements
    const ollamaModelSelect = document.getElementById("ollama-model-select");
    const refreshModelsBtn = document.getElementById("refresh-models-btn");
    const saveModelBtn = document.getElementById("save-model-btn");
    const modelStatusMessage = document.getElementById("model-status-message");

    const OLLAMA_API_TAGS_URL = "http://localhost:11434/api/tags";

    // --- PAT Management Logic ---
    if (patInput) {
        chrome.storage.sync.get(["jiraPat"], (result) => {
            if (result.jiraPat) {
                patInput.value = result.jiraPat;
            }
        });

        if (toggleVisibilityBtn) {
            toggleVisibilityBtn.addEventListener("click", () => {
                if (patInput.type === "password") {
                    patInput.type = "text";
                    toggleVisibilityBtn.textContent = "hide";
                } else {
                    patInput.type = "password";
                    toggleVisibilityBtn.textContent = "see";
                }
            });
        } else {
            console.error("ojira Options Error: Toggle visibility button (ID 'toggle-visibility-btn') not found in the DOM.");
        }
    } else {
        console.error("ojira Options Error: PAT input field (ID 'pat-input') not found in the DOM. PAT functionality will be affected.");
        if (patStatusMessage) {
            patStatusMessage.textContent = "Error: PAT input field not found. Please report this issue.";
            patStatusMessage.className = "status-error";
        }
        if (!toggleVisibilityBtn) {
             console.error("ojira Options Error: Toggle visibility button (ID 'toggle-visibility-btn') also not found.");
        }
    }

    if (savePatBtn) {
        savePatBtn.addEventListener("click", () => {
            if (!patInput) {
                patStatusMessage.textContent = "Error: PAT input field not found.";
                patStatusMessage.className = "status-error";
                return;
            }
            const patValue = patInput.value.trim();
            if (patValue) {
                chrome.storage.sync.set({ "jiraPat": patValue }, () => {
                    if (chrome.runtime.lastError) {
                        patStatusMessage.textContent = "Error saving token: " + chrome.runtime.lastError.message;
                        patStatusMessage.className = "status-error";
                    } else {
                        patStatusMessage.textContent = "Token saved successfully!";
                        patStatusMessage.className = "status-success";
                    }
                    setTimeout(() => { patStatusMessage.textContent = ""; patStatusMessage.className = ""; }, 3000);
                });
            } else {
                patStatusMessage.textContent = "Please enter a token before saving.";
                patStatusMessage.className = "status-error";
                setTimeout(() => { patStatusMessage.textContent = ""; patStatusMessage.className = ""; }, 3000);
            }
        });
    }

    if (clearPatBtn) {
        clearPatBtn.addEventListener("click", () => {
            if (!patInput) {
                patStatusMessage.textContent = "Error: PAT input field not found.";
                patStatusMessage.className = "status-error";
                return;
            }
            if (confirm("Are you sure you want to clear the saved Jira PAT?")) {
                chrome.storage.sync.remove("jiraPat", () => {
                    if (chrome.runtime.lastError) {
                        patStatusMessage.textContent = "Error clearing token: " + chrome.runtime.lastError.message;
                        patStatusMessage.className = "status-error";
                    } else {
                        patInput.value = "";
                        patStatusMessage.textContent = "Token cleared successfully!";
                        patStatusMessage.className = "status-success";
                    }
                    setTimeout(() => { patStatusMessage.textContent = ""; patStatusMessage.className = ""; }, 3000);
                });
            }
        });
    }

    // --- Jira URL Management Logic ---
    if (jiraUrlInput) {
        chrome.storage.sync.get(["jiraUrl"], (result) => {
            if (result.jiraUrl) {
                jiraUrlInput.value = result.jiraUrl;
            }
        });
    } else {
        console.error("ojira Options Error: Jira URL input field (ID 'jira-url-input') not found.");
        if(jiraUrlStatusMessage) {
            jiraUrlStatusMessage.textContent = "Error: Jira URL input field not found.";
            jiraUrlStatusMessage.className = "status-error";
        }
    }

    if (saveJiraUrlBtn) {
        saveJiraUrlBtn.addEventListener("click", () => {
            if (!jiraUrlInput) {
                jiraUrlStatusMessage.textContent = "Error: Jira URL input field not found.";
                jiraUrlStatusMessage.className = "status-error";
                return;
            }
            const urlValue = jiraUrlInput.value.trim();
            if (urlValue) {
                try {
                    new URL(urlValue); // Validate URL format
                    chrome.storage.sync.set({ "jiraUrl": urlValue }, () => {
                        if (chrome.runtime.lastError) {
                            jiraUrlStatusMessage.textContent = "Error saving Jira URL: " + chrome.runtime.lastError.message;
                            jiraUrlStatusMessage.className = "status-error";
                        } else {
                            jiraUrlStatusMessage.textContent = "Jira URL saved successfully!";
                            jiraUrlStatusMessage.className = "status-success";
                        }
                        setTimeout(() => { jiraUrlStatusMessage.textContent = ""; jiraUrlStatusMessage.className = ""; }, 3000);
                    });
                } catch (_) {
                    jiraUrlStatusMessage.textContent = "Invalid URL format. Please enter a valid URL (e.g., https://your-company.atlassian.net).";
                    jiraUrlStatusMessage.className = "status-error";
                    setTimeout(() => { jiraUrlStatusMessage.textContent = ""; jiraUrlStatusMessage.className = ""; }, 5000);
                }
            } else {
                jiraUrlStatusMessage.textContent = "Please enter a Jira URL before saving.";
                jiraUrlStatusMessage.className = "status-error";
                setTimeout(() => { jiraUrlStatusMessage.textContent = ""; jiraUrlStatusMessage.className = ""; }, 3000);
            }
        });
    }

    // --- Ollama Model Selection Logic ---
    async function fetchAndPopulateModels() {
        if (!ollamaModelSelect || !modelStatusMessage) {
            console.error("ojira Options Error: Model selection UI elements not found.");
            return;
        }
        ollamaModelSelect.innerHTML = "<option value=\"\">Fetching models...</option>";
        modelStatusMessage.textContent = "Fetching models...";
        modelStatusMessage.className = "status-info";
        try {
            const response = await fetch(OLLAMA_API_TAGS_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch models from Ollama. Status: ${response.status}. Ensure Ollama is running at ${OLLAMA_API_TAGS_URL}.`);
            }
            const data = await response.json();
            ollamaModelSelect.innerHTML = ""; 
            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    const option = document.createElement("option");
                    option.value = model.name;
                    option.textContent = model.name;
                    ollamaModelSelect.appendChild(option);
                });
                modelStatusMessage.textContent = "Models loaded successfully.";
                modelStatusMessage.className = "status-success";
            } else {
                ollamaModelSelect.innerHTML = "<option value=\"\">No models found</option>";
                modelStatusMessage.textContent = "No models found. Ensure Ollama is running and has models.";
                modelStatusMessage.className = "status-warning";
            }
        } catch (error) {
            console.error("Error fetching Ollama models:", error);
            ollamaModelSelect.innerHTML = "<option value=\"\">Error fetching models</option>";
            modelStatusMessage.textContent = error.message;
            modelStatusMessage.className = "status-error";
        }
        chrome.storage.sync.get(["ollamaModel"], (result) => {
            if (result.ollamaModel && ollamaModelSelect.querySelector(`option[value="${result.ollamaModel}"]`)) {
                ollamaModelSelect.value = result.ollamaModel;
            } else if (result.ollamaModel) {
                console.warn(`Saved model "${result.ollamaModel}" not found in fetched list.`);
            }
        });
        setTimeout(() => { modelStatusMessage.textContent = ""; modelStatusMessage.className = ""; }, 5000);
    }

    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener("click", fetchAndPopulateModels);
    } else {
        console.error("ojira Options Error: Refresh models button not found.");
    }

    if (saveModelBtn) {
        saveModelBtn.addEventListener("click", () => {
            if (!ollamaModelSelect) {
                modelStatusMessage.textContent = "Error: Model select element not found.";
                modelStatusMessage.className = "status-error";
                return;
            }
            const selectedModel = ollamaModelSelect.value;
            if (selectedModel && selectedModel !== "") {
                chrome.storage.sync.set({ "ollamaModel": selectedModel }, () => {
                    if (chrome.runtime.lastError) {
                        modelStatusMessage.textContent = "Error saving model: " + chrome.runtime.lastError.message;
                        modelStatusMessage.className = "status-error";
                    } else {
                        modelStatusMessage.textContent = `Model "${selectedModel}" saved successfully!`;
                        modelStatusMessage.className = "status-success";
                    }
                    setTimeout(() => { modelStatusMessage.textContent = ""; modelStatusMessage.className = ""; }, 3000);
                });
            } else {
                modelStatusMessage.textContent = "Please select a model before saving.";
                modelStatusMessage.className = "status-error";
                setTimeout(() => { modelStatusMessage.textContent = ""; modelStatusMessage.className = ""; }, 3000);
            }
        });
    } else {
        console.error("ojira Options Error: Save model button not found.");
    }

    fetchAndPopulateModels();
});

