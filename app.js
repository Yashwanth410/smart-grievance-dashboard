// ============================================================================
// SMART GRIEVANCE DASHBOARD - Main Application
// ============================================================================

let complaintHistory = [];

const form = document.getElementById("complaintForm");
const output = document.getElementById("output");
const sidebarItems = document.querySelectorAll(".sidebar li");
let currentSidebarIndex = 0;
const dashboardView = document.getElementById("dashboardView");
const submissionsView = document.getElementById("submissionsView");
const submissionsList = document.getElementById("submissionsList");
const analyticsView = document.getElementById("analyticsView");
const analyticsContent = document.getElementById("analyticsContent");
let analyticsCharts = [];

// ============================================================================
// AI-INSPIRED LOGIC (MUSE Framework)
// ============================================================================
//function
function submitForm() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const category = document.getElementById("category").value;
    const priorityLevel = document.getElementById("priorityLevel") ? document.getElementById("priorityLevel").value : "NORMAL";
    const imageFile = document.getElementById("imageUpload").files[0];

    if (!title || !description) {
        showNotification("Please fill in all required fields", "warning");
        return;
    }

    complaintHistory.push(category);
    const count = complaintHistory.filter(c => c === category).length;

    // ===== AI-INSPIRED PRIORITY LOGIC =====
    let priority = priorityLevel;
    let reason = "User specified priority level.";

    // AI logic can adjust priority based on history
    if (count >= 3 && priorityLevel !== "URGENT") {
        priority = "HIGH";
        reason = "Multiple similar complaints detected. Priority escalated.";
    } else if (count === 2 && priorityLevel === "NORMAL") {
        priority = "MEDIUM";
        reason = "Similar issue reported earlier. Priority adjusted.";
    }

    let cls =
        priority === "HIGH" || priority === "URGENT" ? "priority-high priority-badge" :
        priority === "MEDIUM" ? "priority-medium priority-badge" :
        "priority-normal priority-badge";

    // Add loading state
    output.innerHTML = `
        <h2>AI Decision (MUSE-Inspired)</h2>
        <div class="loading-spinner"></div>
        <p>Processing...</p>
    `;
    output.classList.add("processing");

    // ============================================================================
    // FIREBASE STORAGE: Image Upload Handler
    // ============================================================================
    const uploadImagePromise = imageFile 
        ? uploadImageToStorage(imageFile) 
        : Promise.resolve(null);

    uploadImagePromise.then((imageUrl) => {
        // Save complaint to Firestore with image URL and status
        const complaintData = {
            title,
            description,
            category,
            priority,
            reason,
            status: "Submitted", // Default status
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add image URL if available
        if (imageUrl) {
            complaintData.imageUrl = imageUrl;
        }

        return db.collection("complaints").add(complaintData);
    }).then(() => {
        output.innerHTML = `
            <h2>AI Decision (MUSE-Inspired)</h2>
            <div class="ai-result">
                <p><b>Category:</b> <span class="category-badge">${category}</span></p>
                <p><b>Priority:</b> <span class="${cls}">${priority}</span></p>
                <p><b>Reason:</b> ${reason}</p>
                <p class="success-msg">✔ Saved to Firestore</p>
            </div>
            <p class="ai-explanation" style="display: block; margin-top: 15px; font-size: 0.9rem; color: var(--text-muted); font-style: italic;">
                Priority is dynamically assigned by learning from past complaint frequency and patterns.
            </p>
        `;
        output.classList.remove("processing");
        output.classList.add("result-visible");
        
        // Reset form including image
        form.reset();
        resetImageUpload();
        
        showNotification("Complaint submitted successfully!", "success");
        
        // Animate output card
        setTimeout(() => {
            output.classList.add("pulse");
            setTimeout(() => output.classList.remove("pulse"), 600);
        }, 100);
        
        // Submissions will auto-refresh via real-time listener
    }).catch((error) => {
        output.innerHTML = `
            <h2>AI Decision (MUSE-Inspired)</h2>
            <p class="error-msg">✗ Error: ${error.message}</p>
        `;
        output.classList.remove("processing");
        showNotification("Error submitting complaint", "error");
    });
}

// ============================================================================
// FIREBASE STORAGE: Image Upload Function
// ============================================================================
function uploadImageToStorage(imageFile) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(imageFile.type)) {
        return Promise.reject(new Error('Invalid file type. Please upload JPG or PNG images only.'));
    }

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        return Promise.reject(new Error('Image size too large. Maximum size is 5MB.'));
    }

    // Create unique filename
    const timestamp = Date.now();
    const filename = `complaints/${timestamp}_${imageFile.name}`;
    
    // Upload to Firebase Storage
    const storageRef = storage.ref().child(filename);
    return storageRef.put(imageFile).then((snapshot) => {
        // Get download URL
        return snapshot.ref.getDownloadURL();
    });
}

// Reset image upload UI
function resetImageUpload() {
    const preview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const uploadText = document.getElementById("imageUploadText");
    
    if (preview) preview.style.display = "none";
    if (previewImg) previewImg.src = "";
    if (uploadText) uploadText.textContent = "📷 Choose Image (JPG/PNG)";
}

// Form submit event
form.addEventListener("submit", function (e) {
    e.preventDefault();
    const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
    if (submitBtn.dataset.mode === 'update') {
        updateSubmission();
    } else {
        submitForm();
    }
});
// Keyboard shortcuts
document.addEventListener("keydown", function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (document.activeElement.tagName !== "TEXTAREA" || e.shiftKey === false) {
            const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
            if (submitBtn && submitBtn.dataset.mode === 'update') {
                updateSubmission();
            } else {
                submitForm();
            }
        }
    }

    // Esc to clear form or cancel edit
    if (e.key === "Escape") {
        if (document.activeElement.tagName === "INPUT" || 
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.tagName === "SELECT") {
            form.reset();
            document.activeElement.blur();
            
            // Reset edit mode
            if (editingId) {
                editingId = null;
                const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Submit Complaint';
                    submitBtn.dataset.mode = 'submit';
                }
                showNotification("Edit mode cancelled", "info");
            } else {
                showNotification("Form cleared", "info");
            }
        }
    }

    // Number keys (1-3) to select sidebar items
    if (e.key >= "1" && e.key <= "3" && !e.ctrlKey && !e.metaKey) {
        const index = parseInt(e.key) - 1;
        if (sidebarItems[index]) {
            sidebarItems.forEach(item => item.classList.remove("active"));
            sidebarItems[index].classList.add("active");
            currentSidebarIndex = index;
            navigateToView(index);
            showNotification(`Navigated to section ${e.key}`, "info");
        }
    }

    // Arrow keys
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.ctrlKey && !e.metaKey) {
        const target = document.activeElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") {
            e.preventDefault();
            if (e.key === "ArrowUp") {
                currentSidebarIndex = currentSidebarIndex > 0 ? currentSidebarIndex - 1 : sidebarItems.length - 1;
            } else {
                currentSidebarIndex = currentSidebarIndex < sidebarItems.length - 1 ? currentSidebarIndex + 1 : 0;
            }
            sidebarItems.forEach(item => item.classList.remove("active"));
            sidebarItems[currentSidebarIndex].classList.add("active");
            navigateToView(currentSidebarIndex);
        }
    }

});

// Sidebar click
sidebarItems.forEach((item, index) => {
    item.addEventListener("click", function() {
        sidebarItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");
        currentSidebarIndex = index;
        navigateToView(index);
    });
});

// Navigation
function navigateToView(index) {
    if (index === 0) {
        // Home/Dashboard view
        dashboardView.style.display = "grid";
        submissionsView.style.display = "none";
        analyticsView.style.display = "none";
    } else if (index === 1) {
        // Submissions view
        dashboardView.style.display = "none";
        submissionsView.style.display = "grid";
        analyticsView.style.display = "none";
        loadSubmissions(); // This sets up real-time listener
    } else if (index === 2) {
        // Analytics view
        dashboardView.style.display = "none";
        submissionsView.style.display = "none";
        analyticsView.style.display = "grid";
        loadAnalytics();
    }
}

// Real-time listener
let unsubscribeSubmissions = null;

// Load submissions from Firestore with real-time updates
function loadSubmissions() {
    submissionsList.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading submissions...</p>
    `;
    
    // Unsubscribe from previous listener if exists
    if (unsubscribeSubmissions) {
        unsubscribeSubmissions();
    }
    
    // Set up real-time listener
    unsubscribeSubmissions = db.collection("complaints")
        .orderBy("timestamp", "desc")
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                submissionsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <h3>No grievances submitted yet</h3>
                        <p>Be the first to report an issue.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let timestamp = 'Date not available';
                if (data.timestamp) {
                    if (data.timestamp.toDate) {
                        timestamp = data.timestamp.toDate().toLocaleString();
                    } else if (data.timestamp instanceof Date) {
                        timestamp = data.timestamp.toLocaleString();
                    }
                }
                
                const priorityClass = 
                    data.priority === "HIGH" || data.priority === "URGENT" ? "priority-high priority-badge" :
                    data.priority === "MEDIUM" ? "priority-medium priority-badge" :
                    "priority-normal priority-badge";
                
                const priorityText = data.priority || 'NORMAL';
                const status = data.status || 'Submitted';
                const statusClass = 
                    status === 'Resolved' ? 'status-resolved' :
                    status === 'In Progress' ? 'status-progress' :
                    'status-submitted';
                
                // Image thumbnail HTML
                let imageHtml = '';
                if (data.imageUrl) {
                    imageHtml = `
                        <div class="submission-image-container">
                            <img src="${escapeHtml(data.imageUrl)}" 
                                 alt="Complaint image" 
                                 class="submission-thumbnail"
                                 onclick="openImageModal('${escapeHtml(data.imageUrl)}')">
                            <span class="image-label">Click to view full image</span>
                        </div>
                    `;
                } else {
                    imageHtml = '<p class="no-image-label">No image provided</p>';
                }
                
                html += `
                    <div class="submission-item" data-id="${doc.id}">
                        <div class="submission-header">
                            <h3 class="submission-title">${escapeHtml(data.title || 'Untitled')}</h3>
                            <span class="submission-time">${timestamp}</span>
                        </div>
                        <div class="submission-body">
                            <p class="submission-description">${escapeHtml(data.description || 'No description')}</p>
                            <div class="submission-meta">
                                <span class="category-badge">${escapeHtml(data.category || 'Uncategorized')}</span>
                                <span class="${priorityClass}">${priorityText}</span>
                                <span class="status-badge ${statusClass}">${status}</span>
                            </div>
                            ${data.reason ? `<p class="submission-reason"><b>Reason:</b> ${escapeHtml(data.reason)}</p>` : ''}
                            ${imageHtml}
                        </div>
                        <div class="submission-footer">
                            <span class="submission-id">ID: ${doc.id.substring(0, 8)}...</span>
                            <div class="submission-actions">
                                <button class="action-btn edit-btn" onclick="editSubmission('${doc.id}')" title="Edit">✏️</button>
                                <button class="action-btn delete-btn" onclick="deleteSubmission('${doc.id}')" title="Delete">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            submissionsList.innerHTML = html;
        }, (error) => {
            submissionsList.innerHTML = `
                <div class="empty-state error-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error Loading Submissions</h3>
                    <p>${error.message}</p>
                </div>
            `;
            showNotification("Error loading submissions", "error");
        });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete submission
function deleteSubmission(docId) {
    if (!confirm('Are you sure you want to delete this submission?')) {
        return;
    }
    
    db.collection("complaints").doc(docId).delete()
        .then(() => {
            showNotification("Submission deleted successfully!", "success");
        })
        .catch((error) => {
            showNotification("Error deleting submission: " + error.message, "error");
        });
}

// Edit submission
let editingId = null;

function editSubmission(docId) {
    // Get the submission data
    db.collection("complaints").doc(docId).get()
        .then((doc) => {
            if (!doc.exists) {
                showNotification("Submission not found", "error");
                return;
            }
            
            const data = doc.data();
            editingId = docId;
            
            // Populate form with existing data
            document.getElementById("title").value = data.title || '';
            document.getElementById("description").value = data.description || '';
            document.getElementById("category").value = data.category || 'Road';
            if (document.getElementById("priorityLevel")) {
                document.getElementById("priorityLevel").value = data.priority || 'NORMAL';
            }
            
            // Switch to dashboard view
            navigateToView(0);
            
            // Change submit button to update
            const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
            submitBtn.textContent = 'Update Complaint';
            submitBtn.dataset.mode = 'update';
            
            // Scroll to form
            document.getElementById("title").scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById("title").focus();
            
            showNotification("Editing submission... Make changes and click Update", "info");
        })
        .catch((error) => {
            showNotification("Error loading submission: " + error.message, "error");
        });
}

// Update form submission handler
function updateSubmission() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const category = document.getElementById("category").value;
    const priorityLevel = document.getElementById("priorityLevel") ? document.getElementById("priorityLevel").value : "NORMAL";
    
    if (!title || !description) {
        showNotification("Please fill in all required fields", "warning");
        return;
    }
    
    if (!editingId) {
        showNotification("No submission selected for update", "error");
        return;
    }
    
    db.collection("complaints").doc(editingId).update({
        title,
        description,
        category,
        priority: priorityLevel,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showNotification("Submission updated successfully!", "success");
        form.reset();
        editingId = null;
        
        // Reset submit button
        const submitBtn = document.querySelector('#complaintForm button[type="submit"]');
        submitBtn.textContent = 'Submit Complaint';
        submitBtn.dataset.mode = 'submit';
        
        // Show updated info
        const updatePriorityClass = 
            priorityLevel === "HIGH" || priorityLevel === "URGENT" ? "priority-high priority-badge" :
            priorityLevel === "MEDIUM" ? "priority-medium priority-badge" :
            "priority-normal priority-badge";
            
        output.innerHTML = `
            <h2>AI Decision (MUSE-Inspired)</h2>
            <div class="ai-result">
                <p><b>Category:</b> <span class="category-badge">${category}</span></p>
                <p><b>Priority:</b> <span class="${updatePriorityClass}">${priorityLevel}</span></p>
                <p class="success-msg">✔ Updated in Firestore</p>
            </div>
        `;
    })
    .catch((error) => {
        showNotification("Error updating submission: " + error.message, "error");
    });
}


// Notification system
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Keyboard hints toggle
function toggleKeyboardHints() {
    const hints = document.getElementById("keyboardHints");
    if (hints) {
        hints.classList.toggle("visible");
    }
}

// Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const body = document.body;
    
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener("click", function() {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            showNotification(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`, "info");
        });
    }
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

// Load Analytics with Charts
function loadAnalytics() {
    analyticsContent.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading analytics...</p>
    `;
    
    // Destroy existing charts
    analyticsCharts.forEach(chart => chart.destroy());
    analyticsCharts = [];
    
    db.collection("complaints").get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                analyticsContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>No Data Available</h3>
                        <p>Submit some complaints to see analytics!</p>
                    </div>
                `;
                return;
            }
            
            // Process data
            const categoryCount = {};
            const priorityCount = {};
            const dailyCount = {};
            const totalCount = querySnapshot.size;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Category count
                const category = data.category || 'Uncategorized';
                categoryCount[category] = (categoryCount[category] || 0) + 1;
                
                // Priority count
                const priority = data.priority || 'NORMAL';
                priorityCount[priority] = (priorityCount[priority] || 0) + 1;
                
                // Daily count
                let dateStr = 'Unknown';
                if (data.timestamp) {
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    dateStr = date.toLocaleDateString();
                }
                dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
            });
            
            // Create HTML with chart containers
            analyticsContent.innerHTML = `
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h3>Total Complaints</h3>
                        <div class="stat-number">${totalCount}</div>
                    </div>
                    <div class="analytics-card">
                        <h3>Categories</h3>
                        <div class="stat-number">${Object.keys(categoryCount).length}</div>
                    </div>
                    <div class="analytics-card">
                        <h3>High Priority</h3>
                        <div class="stat-number priority-high">${priorityCount['HIGH'] || 0}</div>
                    </div>
                    <div class="analytics-card">
                        <h3>Urgent</h3>
                        <div class="stat-number priority-high">${priorityCount['URGENT'] || 0}</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3>Complaints by Category</h3>
                    <canvas id="categoryChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Complaints by Priority</h3>
                    <canvas id="priorityChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Daily Complaints Trend</h3>
                    <canvas id="dailyChart"></canvas>
                </div>
                
                <div class="analytics-insight">
                    <p>💡 <strong>Insight:</strong> Most reported issues in the last 24 hours</p>
                </div>
            `;
            
            // Create charts
            setTimeout(() => {
                createCategoryChart(categoryCount);
                createPriorityChart(priorityCount);
                createDailyChart(dailyCount);
            }, 100);
        })
        .catch((error) => {
            analyticsContent.innerHTML = `
                <div class="empty-state error-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error Loading Analytics</h3>
                    <p>${error.message}</p>
                </div>
            `;
            showNotification("Error loading analytics", "error");
        });
}

// Create Category Chart
function createCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Complaints',
                data: Object.values(data),
                backgroundColor: 'rgba(0, 255, 208, 0.6)',
                borderColor: 'rgba(0, 255, 208, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(224, 224, 224, 0.8)'
                    },
                    grid: {
                        color: 'rgba(0, 255, 208, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(224, 224, 224, 0.8)'
                    },
                    grid: {
                        color: 'rgba(0, 255, 208, 0.1)'
                    }
                }
            }
        }
    });
    
    analyticsCharts.push(chart);
}

// Create Priority Chart
function createPriorityChart(data) {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;
    
    const colors = {
        'NORMAL': 'rgba(0, 191, 166, 0.6)',
        'MEDIUM': 'rgba(255, 174, 0, 0.6)',
        'HIGH': 'rgba(255, 77, 77, 0.6)',
        'URGENT': 'rgba(255, 20, 147, 0.6)'
    };
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: Object.keys(data).map(p => colors[p] || 'rgba(128, 128, 128, 0.6)'),
                borderColor: 'rgba(26, 26, 46, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(224, 224, 224, 0.9)',
                        padding: 15
                    }
                }
            }
        }
    });
    
    analyticsCharts.push(chart);
}

// Create Daily Chart
function createDailyChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    // Sort dates
    const sortedDates = Object.keys(data).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return new Date(a) - new Date(b);
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Complaints',
                data: sortedDates.map(d => data[d]),
                borderColor: 'rgba(0, 255, 208, 1)',
                backgroundColor: 'rgba(0, 255, 208, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(0, 255, 208, 1)',
                pointBorderColor: 'rgba(26, 26, 46, 1)',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(224, 224, 224, 0.8)'
                    },
                    grid: {
                        color: 'rgba(0, 255, 208, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(224, 224, 224, 0.8)'
                    },
                    grid: {
                        color: 'rgba(0, 255, 208, 0.1)'
                    }
                }
            }
        }
    });
    
    analyticsCharts.push(chart);
}

// Keyboard hints toggle (removed)
function toggleKeyboardHints() {
    // Function removed - no longer needed
}

// Add keyboard hints element on load
document.addEventListener("DOMContentLoaded", function() {
    // Initialize theme
    initThemeToggle();
    
    // Initialize to dashboard view
    navigateToView(0);
    
    // Refresh submissions button handler
    const refreshBtn = document.getElementById("refreshSubmissions");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", function() {
            loadSubmissions();
            showNotification("Refreshing submissions...", "info");
        });
    }
    
    // Refresh analytics button handler
    const refreshAnalyticsBtn = document.getElementById("refreshAnalytics");
    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener("click", function() {
            loadAnalytics();
            showNotification("Refreshing analytics...", "info");
        });
    }
    
    // Rotate placeholder examples
    rotatePlaceholders();
    
    // ============================================================================
    // IMAGE UPLOAD HANDLERS
    // Handles image preview and upload UI interactions
    // ============================================================================
    const imageUpload = document.getElementById("imageUpload");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const removeImageBtn = document.getElementById("removeImage");
    const uploadText = document.getElementById("imageUploadText");
    
    if (imageUpload) {
        imageUpload.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.match('image.*')) {
                    showNotification("Please select a valid image file (JPG/PNG)", "warning");
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewImg) previewImg.src = e.target.result;
                    if (imagePreview) imagePreview.style.display = "block";
                    if (uploadText) uploadText.textContent = "📷 Image selected";
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removeImageBtn) {
        removeImageBtn.addEventListener("click", function() {
            resetImageUpload();
            if (imageUpload) imageUpload.value = "";
        });
    }
    
    // ============================================================================
    // IMAGE MODAL (Lightbox) HANDLERS
    // Opens full-size image in modal when thumbnail is clicked
    // ============================================================================
    const imageModal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");
    const modalClose = document.querySelector(".image-modal-close");
    
    if (modalClose) {
        modalClose.addEventListener("click", function() {
            if (imageModal) imageModal.style.display = "none";
        });
    }
    
    if (imageModal) {
        imageModal.addEventListener("click", function(e) {
            if (e.target === imageModal) {
                imageModal.style.display = "none";
            }
        });
    }
    
    // Make openImageModal globally accessible
    window.openImageModal = function(imageUrl) {
        if (modalImage) modalImage.src = imageUrl;
        if (imageModal) imageModal.style.display = "flex";
    };
});

// Rotate placeholder examples to show different issues
function rotatePlaceholders() {
    const titleInput = document.getElementById("title");
    if (!titleInput) return;
    
    const examples = [
        "Street light not working on Main Road",
        "Water leakage in building A",
        "Power cut in sector 5",
        "Broken drainage system near park",
        "Garbage collection delayed",
        "Damaged road near school",
        "No water supply in Block B",
        "Electricity meter issue",
        "Stray dogs in residential area",
        "Broken street sign at junction"
    ];
    
    let currentIndex = Math.floor(Math.random() * examples.length);
    
    // Set initial random placeholder
    titleInput.placeholder = `Eg: ${examples[currentIndex]}`;
    
    // Change placeholder when input is focused (if empty)
    titleInput.addEventListener("focus", function() {
        if (!this.value) {
            currentIndex = (currentIndex + 1) % examples.length;
            this.placeholder = `Eg: ${examples[currentIndex]}`;
        }
    });
    
    // Change placeholder when input loses focus (if empty)
    titleInput.addEventListener("blur", function() {
        if (!this.value) {
            currentIndex = (currentIndex + 1) % examples.length;
            this.placeholder = `Eg: ${examples[currentIndex]}`;
        }
    });
}

