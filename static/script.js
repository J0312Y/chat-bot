const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const usernameDisplay = document.getElementById("usernameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

function getConversationId() {
  let id = localStorage.getItem("conversation_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("conversation_id", id);
  }
  return id;
}

const conversationId = getConversationId();

// Load current user info
async function loadUser() {
  try {
    const res = await fetch("/auth/me");
    if (!res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json();
    usernameDisplay.textContent = data.username;
  } catch {
    window.location.href = "/";
  }
}

loadUser();

// Logout
logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  localStorage.removeItem("conversation_id");
  window.location.href = "/";
});

function addMessage(content, role) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  div.innerHTML = `<div class="typing-indicator">
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
    const res = await fetch(`/conversations/${conversationId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    for (const msg of data.messages) {
      addMessage(msg.content, msg.role);
    }
  } catch {
    // Pas d'historique, on commence une nouvelle conversation
  }
}

loadHistory();

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
      body: JSON.stringify({ conversation_id: conversationId, message: text }),
    });
    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage("Erreur : " + data.error, "assistant");
    } else {
      addMessage(data.reply, "assistant");
    }
  } catch {
    removeTyping();
    addMessage("Erreur de connexion au serveur.", "assistant");
  }

  sendBtn.disabled = false;
  userInput.focus();
});
