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
