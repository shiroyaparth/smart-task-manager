/* ==========================================================================
   AI Assistant UI Controller
   ========================================================================== */

function toggleAIPanel() {
  const panel = document.getElementById('ai-chat-panel');
  if (panel) {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      const input = document.getElementById('ai-input');
      if (input) setTimeout(() => input.focus(), 150);
    }
  }
}

function renderSimpleMarkdown(text) {
  if (!text) return '';
  let html = escapeHTML(text);
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code block
  html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Line breaks to paragraphs
  return html.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const messagesList = document.getElementById('ai-messages-list');
  if (!input || !messagesList) return;

  const prompt = input.value.trim();
  if (!prompt) return;

  const lower = prompt.toLowerCase();

  // Feature 4 Breakdown command match
  if (lower.startsWith("breakdown:") || lower.startsWith("break down ")) {
    const taskTitle = prompt.replace(/^breakdown:\s*/i, '').replace(/^break down\s*/i, '');
    input.value = '';
    requestTaskBreakdown(taskTitle);
    return;
  }

  // Feature 5 Natural Language creation command match
  if (lower.startsWith("add task:") || lower.startsWith("create task:") || lower.startsWith("remind me to ") || lower.startsWith("schedule ")) {
    const nlText = prompt.replace(/^(add task:|create task:|remind me to|schedule)\s*/i, '');
    input.value = '';
    parseAndCreateNLTask(nlText);
    return;
  }

  // Feature 8 Natural Language Search / Intent match
  if (lower.startsWith("search:") || lower.startsWith("find ") || lower.startsWith("show ") || lower.startsWith("filter ")) {
    const searchQuery = prompt.replace(/^(search:|find|show|filter)\s*/i, '');
    input.value = '';
    parseAISearchIntent(searchQuery);
    return;
  }

  // Render User Bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = prompt;
  messagesList.appendChild(userBubble);

  input.value = '';
  autoScrollAIChat();

  // Render Typing Indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.id = 'ai-typing-indicator';
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const response = await authFetch("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: prompt }),
    });

    typingIndicator.remove();

    if (!response.ok) {
      appendAIBubble("Error fetching response from AI assistant.", true);
      return;
    }

    const data = await response.json();
    appendAIBubble(data.response || "No response received.");
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error. Please try again later.", true);
  }
}

async function requestAICoach(queryText = "What should I work on today?") {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = queryText;
  messagesList.appendChild(userBubble);

  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const response = await authFetch("/ai/coach", {
      method: "POST",
      body: JSON.stringify({ query: queryText }),
    });

    typingIndicator.remove();

    if (!response.ok) {
      appendAIBubble("Error fetching coaching advice.", true);
      return;
    }

    const data = await response.json();
    appendAIBubble(data.response || "No coaching advice generated.");
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error while connecting to AI Coach.", true);
  }
}

async function requestDailySummary(forceRefresh = false) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = "📅 Generate Daily Summary";
  messagesList.appendChild(userBubble);

  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const response = await authFetch(`/ai/daily-summary?force_refresh=${forceRefresh}`);
    typingIndicator.remove();

    if (!response.ok) {
      appendAIBubble("Error generating daily summary.", true);
      return;
    }

    const data = await response.json();
    appendAIBubble(data.response || "No summary available.");
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error fetching daily summary.", true);
  }
}

async function requestWeeklyReport() {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = "📈 Generate Weekly Productivity Report";
  messagesList.appendChild(userBubble);

  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const response = await authFetch('/ai/weekly-report');
    typingIndicator.remove();

    if (!response.ok) {
      appendAIBubble("Error generating weekly report.", true);
      return;
    }

    const data = await response.json();
    appendAIBubble(data.response || "No report available.");
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error fetching weekly report.", true);
  }
}

async function requestTaskBreakdown(taskTitle) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = `Breakdown task: "${taskTitle}"`;
  messagesList.appendChild(userBubble);

  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const response = await authFetch("/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ title: taskTitle }),
    });

    typingIndicator.remove();

    if (!response.ok) {
      appendAIBubble("Error decomposing task.", true);
      return;
    }

    const data = await response.json();
    renderBreakdownResponse(data);
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error during task breakdown.", true);
  }
}

function renderBreakdownResponse(data) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-assistant';

  let html = `<p><strong>🔨 Breakdown for "${escapeHTML(data.task_title)}":</strong></p>`;
  html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">`;

  data.subtasks.forEach((sub, idx) => {
    html += `
      <div style="background: var(--card); border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: var(--text-primary);">${idx + 1}. ${escapeHTML(sub.title)}</strong>
          <span class="badge ${sub.priority === 'high' ? 'badge-high' : 'badge-medium'}">${sub.priority}</span>
        </div>
        ${sub.description ? `<p style="color: var(--text-secondary); margin-bottom: 6px; font-size: 11px;">${escapeHTML(sub.description)}</p>` : ''}
        <button class="btn btn-primary btn-sm" style="font-size: 11px; padding: 2px 8px;" onclick="insertSubtaskToWorkspace('${escapeHTML(sub.title).replace(/'/g, "\\'")}', '${sub.priority}', '${escapeHTML(sub.description || '').replace(/'/g, "\\'")}', this)">
          ➕ Add to Workspace
        </button>
      </div>
    `;
  });

  html += `</div>`;
  bubble.innerHTML = html;
  messagesList.appendChild(bubble);
  autoScrollAIChat();
}

async function parseAndCreateNLTask(nlText) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = `Create task: "${nlText}"`;
  messagesList.appendChild(userBubble);
  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const parseRes = await authFetch("/ai/parse-task", {
      method: "POST",
      body: JSON.stringify({ text: nlText }),
    });

    typingIndicator.remove();

    if (!parseRes.ok) {
      appendAIBubble("Could not parse task details.", true);
      return;
    }

    const taskFields = await parseRes.json();

    const createRes = await authFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: taskFields.title,
        priority: taskFields.priority || "medium",
        description: taskFields.description || null
      }),
    });

    if (!createRes.ok) {
      appendAIBubble("Failed to insert parsed task into database.", true);
      return;
    }

    const createdTask = await createRes.json();
    appendAIBubble(`✅ **Task Created!**\n\n- **Title:** ${createdTask.title}\n- **Priority:** ${createdTask.priority}\n${createdTask.description ? `- **Notes:** ${createdTask.description}` : ''}`);

    if (typeof showToast === 'function') showToast(`Task "${createdTask.title}" created via AI!`, 'success');
    if (typeof loadTasks === 'function') loadTasks();
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Error processing natural language task creation.", true);
  }
}

async function parseAISearchIntent(searchQuery) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble chat-bubble-user';
  userBubble.textContent = `Search intent: "${searchQuery}"`;
  messagesList.appendChild(userBubble);
  autoScrollAIChat();

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-typing-indicator';
  typingIndicator.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
  messagesList.appendChild(typingIndicator);
  autoScrollAIChat();

  try {
    const res = await authFetch("/ai/search-intent", {
      method: "POST",
      body: JSON.stringify({ query: searchQuery }),
    });

    typingIndicator.remove();

    if (!res.ok) {
      appendAIBubble("Failed to parse search intent.", true);
      return;
    }

    const filterObj = await res.json();
    applyStructuredFilterToWorkspace(filterObj, searchQuery);
  } catch (err) {
    typingIndicator.remove();
    appendAIBubble("Network error parsing search intent.", true);
  }
}

function applyStructuredFilterToWorkspace(filterObj, originalQuery) {
  const prioritySelect = document.getElementById('priority-filter');
  const statusSelect = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');

  if (filterObj.priority && prioritySelect) {
    prioritySelect.value = filterObj.priority;
  }
  if (filterObj.status && statusSelect) {
    statusSelect.value = filterObj.status;
  }
  if (filterObj.query && searchInput) {
    searchInput.value = filterObj.query;
  }

  appendAIBubble(`🔍 **Applied AI Filter Intent for "${escapeHTML(originalQuery)}":**\n- **Priority:** ${filterObj.priority || 'All'}\n- **Status:** ${filterObj.status || 'All'}\n- **Keyword:** ${filterObj.query || 'None'}`);

  if (typeof loadTasks === 'function') loadTasks();
}

async function insertSubtaskToWorkspace(title, priority, description, btnEl) {
  try {
    const response = await authFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, priority, description }),
    });

    if (!response.ok) {
      if (typeof showToast === 'function') showToast("Failed to create subtask.", 'error');
      return;
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = "✓ Added";
      btnEl.className = "btn btn-secondary btn-sm";
    }

    if (typeof showToast === 'function') showToast(`Added subtask "${title}" to tasks!`, 'success');
    if (typeof loadTasks === 'function') loadTasks();
  } catch (e) {
    if (typeof showToast === 'function') showToast("Error adding subtask.", 'error');
  }
}

function appendAIBubble(text, isError = false) {
  const messagesList = document.getElementById('ai-messages-list');
  if (!messagesList) return;

  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble chat-bubble-assistant';
  if (isError) aiBubble.style.borderColor = 'var(--danger)';

  aiBubble.innerHTML = renderSimpleMarkdown(text);
  messagesList.appendChild(aiBubble);
  autoScrollAIChat();
}

function autoScrollAIChat() {
  const messagesList = document.getElementById('ai-messages-list');
  if (messagesList) {
    messagesList.scrollTop = messagesList.scrollHeight;
  }
}

// Auto-expand textarea & Enter submit listener
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('ai-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }
});
