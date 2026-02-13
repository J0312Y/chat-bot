const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const usernameDisplay = document.getElementById("usernameDisplay");
const userAvatarSmall = document.getElementById("userAvatarSmall");
const logoutBtn = document.getElementById("logoutBtn");
const sidebar = document.getElementById("sidebar");
const convList = document.getElementById("convList");
const newConvBtn = document.getElementById("newConvBtn");
const toggleSidebar = document.getElementById("toggleSidebar");
const exportBtn = document.getElementById("exportBtn");

let currentConvId = null;
let currentUsername = "";

// --- Markdown setup ---

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
});

function renderMarkdown(text) {
  return marked.parse(text);
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

// --- Auth ---

async function loadUser() {
  try {
    const res = await fetch("/auth/me");
    if (!res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json();
    currentUsername = data.username;
    usernameDisplay.textContent = data.username;
    userAvatarSmall.textContent = getInitial(data.username);
  } catch {
    window.location.href = "/";
  }
}

logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/";
});

// --- Sidebar ---

toggleSidebar.addEventListener("click", () => {
  sidebar.classList.toggle("hidden");
});

async function loadConversations() {
  const res = await fetch("/conversations");
  const data = await res.json();
  convList.innerHTML = "";

  for (const conv of data.conversations) {
    const item = document.createElement("div");
    item.className = `conv-item${conv.id === currentConvId ? " active" : ""}`;
    item.innerHTML = `
      <div class="conv-item-icon">\u{1F4AC}</div>
      <span class="conv-item-title">${escapeHtml(conv.title)}</span>
      <button class="conv-item-delete" title="Supprimer">&times;</button>
    `;
    item.querySelector(".conv-item-title").addEventListener("click", () => {
      switchConversation(conv.id);
    });
    item.querySelector(".conv-item-icon").addEventListener("click", () => {
      switchConversation(conv.id);
    });
    item.querySelector(".conv-item-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      await fetch(`/conversations/${conv.id}`, { method: "DELETE" });
      if (conv.id === currentConvId) {
        startNewConversation();
      }
      loadConversations();
    });
    convList.appendChild(item);
  }
}

function startNewConversation() {
  currentConvId = crypto.randomUUID();
  clearChat();
  loadConversations();
  userInput.focus();
}

newConvBtn.addEventListener("click", startNewConversation);

async function switchConversation(convId) {
  currentConvId = convId;
  clearChat();
  await loadHistory();
  loadConversations();
}

// --- Messages ---

function clearChat() {
  chatMessages.innerHTML = `
    <div class="welcome-section">
      <div class="welcome-icon">\u{2728}</div>
      <h2>Bienvenue !</h2>
      <p>Je suis votre assistant IA. Posez-moi une question, demandez de l'aide ou discutons simplement.</p>
    </div>`;
}

function addMessage(content, role) {
  // Remove welcome section if present
  const welcome = chatMessages.querySelector(".welcome-section");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = `<div class="message-avatar">${role === "user" ? getInitial(currentUsername) : "\u{2728}"}</div>`;

  if (role === "assistant") {
    div.innerHTML = `${avatar}<div class="message-content">${renderMarkdown(content)}</div>`;
  } else {
    div.innerHTML = `${avatar}<div class="message-content">${escapeHtml(content)}</div>`;
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function createStreamingMessage() {
  // Remove welcome section if present
  const welcome = chatMessages.querySelector(".welcome-section");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = "message assistant";
  div.innerHTML = `<div class="message-avatar">\u{2728}</div><div class="message-content"></div>`;
  chatMessages.appendChild(div);
  return div.querySelector(".message-content");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "message assistant";
  div.id = "typingIndicator";
  div.innerHTML = `<div class="message-avatar">\u{2728}</div><div class="typing-indicator">
    <span></span><span></span><span></span>
  </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

async function loadHistory() {
  try {
    const res = await fetch(`/conversations/${currentConvId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    for (const msg of data.messages) {
      addMessage(msg.content, msg.role);
    }
  } catch {
    // No history
  }
}

// --- Export ---

exportBtn.addEventListener("click", () => {
  if (!currentConvId) return;
  window.open(`/conversations/${currentConvId}/export`, "_blank");
});

// --- Streaming chat ---

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: currentConvId, message: text }),
    });

    removeTyping();

    if (!res.ok) {
      const err = await res.json();
      addMessage("Erreur : " + (err.error || "Erreur inconnue"), "assistant");
      sendBtn.disabled = false;
      return;
    }

    const contentEl = createStreamingMessage();
    let fullText = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") break;

        try {
          const data = JSON.parse(payload);
          if (data.error) {
            fullText += "\n\nErreur : " + data.error;
          } else if (data.text) {
            fullText += data.text;
          }
          contentEl.innerHTML = renderMarkdown(fullText);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Final render with syntax highlighting
    contentEl.innerHTML = renderMarkdown(fullText);
    contentEl.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });

    loadConversations();
  } catch {
    removeTyping();
    addMessage("Erreur de connexion au serveur.", "assistant");
  }

  sendBtn.disabled = false;
  userInput.focus();
});

// --- Init ---

async function init() {
  await loadUser();
  currentConvId = crypto.randomUUID();
  await loadConversations();
}

init();
