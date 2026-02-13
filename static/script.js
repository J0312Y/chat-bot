const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const usernameDisplay = document.getElementById("usernameDisplay");
const userAvatarSmall = document.getElementById("userAvatarSmall");
const logoutBtn = document.getElementById("logoutBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const convList = document.getElementById("convList");
const newConvBtn = document.getElementById("newConvBtn");
const toggleSidebar = document.getElementById("toggleSidebar");
const exportBtn = document.getElementById("exportBtn");
const suggestions = document.getElementById("suggestions");

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

// --- Textarea auto-resize ---

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
});

// Submit on Enter, newline on Shift+Enter
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

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

function isMobile() {
  return window.innerWidth <= 768;
}

function openSidebar() {
  sidebar.classList.remove("hidden");
  if (isMobile()) {
    sidebarOverlay.classList.add("active");
  }
}

function closeSidebar() {
  sidebar.classList.add("hidden");
  sidebarOverlay.classList.remove("active");
}

toggleSidebar.addEventListener("click", () => {
  if (sidebar.classList.contains("hidden")) {
    openSidebar();
  } else {
    closeSidebar();
  }
});

sidebarOverlay.addEventListener("click", closeSidebar);

async function loadConversations() {
  const res = await fetch("/conversations");
  const data = await res.json();
  convList.innerHTML = "";

  for (const conv of data.conversations) {
    const item = document.createElement("div");
    item.className = `conv-item${conv.id === currentConvId ? " active" : ""}`;
    item.innerHTML = `
      <div class="conv-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
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
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

// --- Suggestions ---

suggestions.addEventListener("click", (e) => {
  const card = e.target.closest(".suggestion-card");
  if (!card) return;
  const prompt = card.dataset.prompt;
  if (prompt) {
    userInput.value = prompt;
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
    chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

// --- Messages ---

function clearChat() {
  chatMessages.innerHTML = `
    <div class="welcome-section">
      <div class="welcome-avatar">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <path d="M12 20C12 15 16 11 20 11C24 11 28 15 28 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M16 24C16 21 18 19 20 19C22 19 24 21 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="20" cy="28" r="2" fill="currentColor"/>
        </svg>
      </div>
      <h2>Comment puis-je vous aider ?</h2>
      <p>Posez une question, demandez de l'aide sur du code, ou discutons simplement.</p>
      <div class="suggestions" id="suggestions">
        <button class="suggestion-card" data-prompt="Explique-moi comment fonctionne une API REST">
          <div class="suggestion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <span>Explique-moi les API REST</span>
        </button>
        <button class="suggestion-card" data-prompt="Aide-moi a organiser ma journee de travail efficacement">
          <div class="suggestion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span>Organiser ma journee</span>
        </button>
        <button class="suggestion-card" data-prompt="Ecris un script Python pour lire un fichier CSV et afficher des statistiques">
          <div class="suggestion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span>Script Python pour CSV</span>
        </button>
        <button class="suggestion-card" data-prompt="Quelles sont les meilleures pratiques en securite web ?">
          <div class="suggestion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span>Securite web</span>
        </button>
      </div>
    </div>`;

  // Re-bind suggestions click handler
  const newSuggestions = chatMessages.querySelector(".suggestions");
  if (newSuggestions) {
    newSuggestions.addEventListener("click", (e) => {
      const card = e.target.closest(".suggestion-card");
      if (!card) return;
      const prompt = card.dataset.prompt;
      if (prompt) {
        userInput.value = prompt;
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
        chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }
}

const AI_AVATAR_SVG = `<svg width="18" height="18" viewBox="0 0 40 40" fill="none">
  <path d="M12 20C12 15 16 11 20 11C24 11 28 15 28 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M16 24C16 21 18 19 20 19C22 19 24 21 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="20" cy="28" r="2" fill="currentColor"/>
</svg>`;

function addMessage(content, role) {
  const welcome = chatMessages.querySelector(".welcome-section");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = `<div class="message-avatar">${role === "user" ? getInitial(currentUsername) : AI_AVATAR_SVG}</div>`;

  if (role === "assistant") {
    div.innerHTML = `${avatar}<div class="message-content">${renderMarkdown(content)}</div>`;
    addCopyButtons(div);
  } else {
    div.innerHTML = `${avatar}<div class="message-content">${escapeHtml(content)}</div>`;
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function createStreamingMessage() {
  const welcome = chatMessages.querySelector(".welcome-section");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = "message assistant";
  div.innerHTML = `<div class="message-avatar">${AI_AVATAR_SVG}</div><div class="message-content"></div>`;
  chatMessages.appendChild(div);
  return div.querySelector(".message-content");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Copy code button ---

function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;

    // Detect language
    const classes = code.className || "";
    const langMatch = classes.match(/language-(\w+)/);
    const lang = langMatch ? langMatch[1] : "";

    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `
      <span>${lang || "code"}</span>
      <button class="btn-copy" onclick="copyCode(this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copier
      </button>
    `;
    pre.insertBefore(header, pre.firstChild);
  });
}

function copyCode(btn) {
  const pre = btn.closest("pre");
  const code = pre.querySelector("code");
  if (!code) return;

  navigator.clipboard.writeText(code.textContent).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Copie !
    `;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copier
      `;
    }, 2000);
  });
}

// Make copyCode available globally for onclick
window.copyCode = copyCode;

function showTyping() {
  const welcome = chatMessages.querySelector(".welcome-section");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = "message assistant";
  div.id = "typingIndicator";
  div.innerHTML = `<div class="message-avatar">${AI_AVATAR_SVG}</div><div class="typing-indicator">
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
  userInput.style.height = "auto";
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

    // Final render with syntax highlighting and copy buttons
    contentEl.innerHTML = renderMarkdown(fullText);
    contentEl.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
    addCopyButtons(contentEl.closest(".message"));

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
