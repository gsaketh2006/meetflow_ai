document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const searchInput = document.getElementById('history-search');
    const priorityTabs = document.querySelectorAll('.tab-item');
    const dateSortSelect = document.getElementById('filter-date');
    const resetBtn = document.getElementById('reset-filters');
    const historyContent = document.getElementById('history-content');
    
    // --- State ---
    let activePriority = 'all';
    let currentSearch = '';

    /**
     * Updates the summary cards based on visible tasks
     */
    function updateSummaryStats() {
        const visibleTasks = document.querySelectorAll('.task-item:not([style*="display: none"])');
        const totalVisible = visibleTasks.length;
        
        let highPriorityCount = 0;
        let dueSoonCount = 0;
        
        visibleTasks.forEach(task => {
            if (task.getAttribute('data-priority') === 'high') highPriorityCount++;
            
            const deadlineText = task.innerText.toLowerCase();
            if (deadlineText.includes('today') || deadlineText.includes('tomorrow')) {
                dueSoonCount++;
            }
        });

        document.getElementById('summary-total-tasks').innerText = totalVisible;
        document.getElementById('summary-high-priority').innerText = highPriorityCount;
        document.getElementById('summary-due-soon').innerText = dueSoonCount;
    }

    /**
     * Main filter logic: handles search + priority tabs
     */
    function applyFilters() {
        currentSearch = searchInput.value.toLowerCase();
        const dateSections = document.querySelectorAll('.date-section');
        let totalMatches = 0;

        dateSections.forEach(section => {
            const tasks = section.querySelectorAll('.task-item');
            const content = section.querySelector('.date-group-content');
            const header = section.querySelector('.date-group-header');
            let visibleInGroup = 0;

            tasks.forEach(task => {
                const taskName = task.getAttribute('data-task');
                const assignee = task.getAttribute('data-assignee');
                const priority = task.getAttribute('data-priority');

                const matchesSearch = taskName.includes(currentSearch) || assignee.includes(currentSearch);
                const matchesPriority = activePriority === 'all' || priority === activePriority;

                if (matchesSearch && matchesPriority) {
                    task.style.display = 'flex';
                    task.classList.add('animate-slide-up');
                    visibleInGroup++;
                } else {
                    task.style.display = 'none';
                }
            });

            // Toggle whole section visibility
            section.style.display = visibleInGroup > 0 ? 'block' : 'none';
            totalMatches += visibleInGroup;

            // Auto-expand sections that have matches when filtering
            if ((currentSearch !== '' || activePriority !== 'all') && visibleInGroup > 0) {
                content.classList.add('expanded');
                header.classList.add('active');
            }
        });

        updateSummaryStats();
        handleEmptyState(totalMatches);
    }

    /**
     * Shows/hides the "No results" message
     */
    function handleEmptyState(count) {
        let emptyMsg = document.getElementById('no-results-msg');
        if (count === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.id = 'no-results-msg';
                emptyMsg.className = 'glass p-5 text-center text-secondary mt-4 animate-fade-in';
                emptyMsg.innerHTML = `
                    <i class="fas fa-search fa-3x mb-3 opacity-25"></i>
                    <h5>No matches found</h5>
                    <p class="small">Try adjusting your filters or search terms</p>
                `;
                historyContent.appendChild(emptyMsg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    // --- Event Listeners ---

    // Priority Tabs
    priorityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            priorityTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activePriority = tab.getAttribute('data-priority');
            applyFilters();
        });
    });

    // Search Input
    searchInput.addEventListener('input', applyFilters);

    // Date Sorting
    dateSortSelect.addEventListener('change', () => {
        const sections = Array.from(document.querySelectorAll('.date-section'));
        const sortValue = dateSortSelect.value;

        sections.sort((a, b) => {
            const dateA = a.getAttribute('data-date');
            const dateB = b.getAttribute('data-date');
            return sortValue === 'latest' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
        });

        sections.forEach(s => historyContent.appendChild(s));
    });

    // Reset Filters
    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        priorityTabs.forEach(t => t.classList.remove('active'));
        priorityTabs[0].classList.add('active');
        activePriority = 'all';
        dateSortSelect.value = 'latest';
        
        // Trigger sorting reset
        dateSortSelect.dispatchEvent(new Event('change'));
        applyFilters();
        
        // Collapse all but first (initial state)
        const sections = document.querySelectorAll('.date-section');
        sections.forEach((s, i) => {
            const content = s.querySelector('.date-group-content');
            const header = s.querySelector('.date-group-header');
            if (i === 0) {
                content.classList.add('expanded');
                header.classList.add('active');
            } else {
                content.classList.remove('expanded');
                header.classList.remove('active');
            }
        });
    });

    // --- Initial State ---
    // Expand latest date by default
    const firstSection = document.querySelector('.date-section');
    if (firstSection) {
        firstSection.querySelector('.date-group-content').classList.add('expanded');
        firstSection.querySelector('.date-group-header').classList.add('active');
    }
    
    updateSummaryStats();
});

/**
 * Toggle Date Group Collapse/Expand
 */
function toggleDateGroup(date) {
    const content = document.getElementById(`content-${date}`);
    const header = content.previousElementSibling;
    
    content.classList.toggle('expanded');
    header.classList.toggle('active');
}

/**
 * AJAX Delete Task
 */
async function deleteTask(taskId) {
    if (!confirm('Permanently delete this task from history?')) return;

    const card = document.getElementById(`task-${taskId}`);
    const section = card.closest('.date-section');

    try {
        const res = await fetch(`/delete_task/${taskId}`, { method: 'DELETE' });
        
        if (res.ok) {
            // Animate out
            card.style.transform = 'scale(0.9) translateY(10px)';
            card.style.opacity = '0';
            
            setTimeout(() => {
                card.remove();
                
                // Update section count badge
                const badge = section.querySelector('.badge');
                const remainingInGroup = section.querySelectorAll('.task-item').length;
                
                if (remainingInGroup === 0) {
                    section.remove();
                } else {
                    badge.innerText = remainingInGroup;
                }

                // Update summary stats
                document.getElementById('history-search').dispatchEvent(new Event('input'));
                
                // If everything empty, reload for empty state
                if (document.querySelectorAll('.task-item').length === 0) {
                    location.reload();
                }
            }, 300);
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete task');
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert('Network error. Check connection.');
    }
}
