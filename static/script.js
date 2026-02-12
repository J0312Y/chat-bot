const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const conversationHistory = [];

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

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  conversationHistory.push({ role: "user", content: text });
  userInput.value = "";
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });
    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage("Erreur : " + data.error, "assistant");
    } else {
      addMessage(data.reply, "assistant");
      conversationHistory.push({ role: "assistant", content: data.reply });
    }
  } catch {
    removeTyping();
    addMessage("Erreur de connexion au serveur.", "assistant");
  }

  sendBtn.disabled = false;
  userInput.focus();
});
