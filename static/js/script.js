document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    const processBtn = document.getElementById("process-btn");
    const saveBtn = document.getElementById("save-btn");
    const statusContainer = document.getElementById("status-container");
    const statusText = document.getElementById("status-text");
    const progressBar = document.getElementById("progress-bar");
    const aiStats = document.getElementById("ai-stats");
    const taskFeed = document.getElementById("task-feed");
    const placeholder = document.getElementById("placeholder-view");

    let currentTasks = [];

    // Drag and Drop Handling
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("active");
    });

    ["dragleave", "dragend"].forEach(type => {
        dropZone.addEventListener(type, () => dropZone.classList.remove("active"));
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("active");
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (fileInput.files.length) {
            handleFileSelection(fileInput.files[0]);
        }
    });

    function handleFileSelection(file) {
        dropZone.innerHTML = `
            <i class="fas fa-file-alt fa-3x mb-3 text-success"></i>
            <h6 class="mb-1">${file.name}</h6>
            <p class="small text-secondary">${(file.size / 1024).toFixed(2)} KB</p>
        `;
        processBtn.classList.remove("disabled");
    }

    // Main AI Orchestration
    processBtn.addEventListener("click", async () => {
        if (!fileInput.files.length) return;

        // Reset state
        processBtn.classList.add("disabled");
        statusContainer.classList.remove("d-none");
        aiStats.classList.add("d-none");
        taskFeed.classList.add("d-none");
        placeholder.classList.remove("d-none");

        // AI "Thinking" stages
        const stages = [
            { text: "Scanning transcript...", p: 25 },
            { text: "Extracting entities...", p: 50 },
            { text: "Calibrating priorities...", p: 75 },
            { text: "Finalizing plan...", p: 90 }
        ];

        let idx = 0;
        const stageInterval = setInterval(() => {
            if (idx < stages.length) {
                statusText.innerText = stages[idx].text;
                progressBar.style.width = `${stages[idx].p}%`;
                idx++;
            }
        }, 1000);

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
            const res = await fetch("/upload_notes", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            clearInterval(stageInterval);

            if (res.ok) {
                progressBar.style.width = "100%";
                statusText.innerText = "Orchestration Complete!";
                setTimeout(() => {
                    currentTasks = data.tasks || [];
                    renderDashboard(data);
                }, 500);
            } else {
                alert(data.error || "Processing failed");
                resetUI();
            }
        } catch (err) {
            clearInterval(stageInterval);
            alert("Network error. Please check your connection.");
            resetUI();
        }
    });

    function renderDashboard(data) {
        statusContainer.classList.add("d-none");
        placeholder.classList.add("d-none");
        taskFeed.classList.remove("d-none");
        aiStats.classList.remove("d-none");
        document.getElementById("stats-overview").classList.remove("d-none");

        document.getElementById("meta-confidence").innerText = `${data.confidence_score}%`;
        document.getElementById("meta-time").innerText = `${data.processing_time}s`;

        let tasks = data.tasks || [];
        currentTasks = tasks; // Store original for filtering
        
        // Update Stats (RESTORED)
        const highCount = tasks.filter(t => (t.priority || "").toLowerCase() === "high").length;
        const deadlineCount = tasks.filter(t => t.deadline && !t.deadline.toLowerCase().includes("no deadline")).length;
        
        document.getElementById("stat-total").innerText = tasks.length;
        document.getElementById("stat-high").innerText = highCount;
        document.getElementById("stat-deadlines").innerText = deadlineCount;

        // Initialize Tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        displayTasks(currentTasks);
    }

    function displayTasks(tasks) {
        const sections = {
            high: document.querySelector("#section-high .task-container"),
            medium: document.querySelector("#section-medium .task-container"),
            low: document.querySelector("#section-low .task-container")
        };

        Object.values(sections).forEach(s => s.innerHTML = "");

        tasks.forEach((t, i) => {
            const p = (t.priority || "Low").toLowerCase();
            const container = sections[p] || sections.low;
            
            const confPercent = Math.round((t.confidence || 0) * 100);
            let confClass = "conf-low";
            if (confPercent >= 80) confClass = "conf-high";
            else if (confPercent >= 60) confClass = "conf-medium";

            const card = document.createElement("div");
            card.className = `glass task-card priority-${p}`;
            card.style.animation = `slideIn 0.5s ease-out ${i * 0.1}s backwards`;
            
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="fw-bold mb-2">● ${t.task}</h6>
                    <span class="badge badge-${p}">${t.priority}</span>
                </div>
                <div class="row g-2 text-secondary small pt-2">
                    <div class="col-6"><i class="fas fa-user-circle me-1"></i> ${t.assignee}</div>
                    <div class="col-6 text-end"><i class="fas fa-calendar-alt me-1"></i> ${t.deadline}</div>
                </div>
                <!-- Confidence Indicator -->
                <div class="confidence-container" data-bs-toggle="tooltip" title="This score represents how certain the AI is about this extracted task.">
                    <div class="confidence-label">
                        <span>Confidence</span>
                        <span>${confPercent}%</span>
                    </div>
                    <div class="confidence-bar-bg">
                        <div class="confidence-bar-fill ${confClass}" style="width: ${confPercent}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Hide empty sections
        Object.keys(sections).forEach(k => {
            const sec = document.getElementById(`section-${k}`);
            sections[k].children.length === 0 ? sec.classList.add("d-none") : sec.classList.remove("d-none");
        });
    }

    // Filtering logic
    document.getElementById("confidence-filter").addEventListener("change", (e) => {
        const val = e.target.value;
        let filtered = currentTasks;
        
        if (val === "high") {
            filtered = currentTasks.filter(t => t.confidence >= 0.8);
        } else if (val === "medium") {
            filtered = currentTasks.filter(t => t.confidence >= 0.6 && t.confidence < 0.8);
        }
        
        displayTasks(filtered);
    });

    // Sorting logic
    let sortAsc = false;
    document.getElementById("sort-confidence").addEventListener("click", () => {
        sortAsc = !sortAsc;
        const sorted = [...currentTasks].sort((a, b) => {
            return sortAsc ? (a.confidence - b.confidence) : (b.confidence - a.confidence);
        });
        displayTasks(sorted);
    });

    // Database Persistence
    saveBtn.addEventListener("click", async () => {
        if (!currentTasks.length) return;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const res = await fetch("/save_tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tasks: currentTasks })
            });

            if (res.ok) {
                saveBtn.innerHTML = '<i class="fas fa-check me-2"></i> Saved to History';
                saveBtn.classList.remove("btn-success");
                saveBtn.classList.add("btn-outline-success");
                setTimeout(() => {
                    window.location.href = "/history";
                }, 1000);
            } else {
                const data = await res.json();
                alert(data.error || "Save failed");
                saveBtn.disabled = false;
                saveBtn.innerText = "Save to Database";
            }
        } catch (err) {
            alert("Database connection error");
            saveBtn.disabled = false;
        }
    });

    function resetUI() {
        statusContainer.classList.add("d-none");
        processBtn.classList.remove("disabled");
        progressBar.style.width = "0%";
    }

    const fullReset = () => {
        // Clear state
        currentTasks = [];
        fileInput.value = "";
        
        // Reset Drop Zone
        dropZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt fa-3x mb-3 text-primary"></i>
            <h6 class="mb-1">Drop file here</h6>
            <p class="small text-secondary">or click to browse</p>
        `;
        
        // Hide/Show areas
        taskFeed.classList.add("d-none");
        aiStats.classList.add("d-none");
        document.getElementById("stats-overview").classList.add("d-none");
        placeholder.classList.remove("d-none");
        statusContainer.classList.add("d-none");
        
        // Reset buttons
        processBtn.classList.add("disabled");
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i> Save to Database';
        saveBtn.className = "btn btn-success flex-grow-1 py-3 rounded-pill fw-bold shadow-lg";
        
        // Reset stats
        document.getElementById("stat-total").innerText = "0";
        document.getElementById("stat-high").innerText = "0";
        document.getElementById("stat-deadlines").innerText = "0";
        
        // Reset progress bar
        progressBar.style.width = "0%";
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Attach Refresh Listeners
    document.getElementById("refresh-btn")?.addEventListener("click", fullReset);
    document.getElementById("reset-dashboard-sidebar")?.addEventListener("click", fullReset);
    
    // Export functionality
    document.getElementById("export-btn")?.addEventListener("click", () => {
        window.print();
    });
});
