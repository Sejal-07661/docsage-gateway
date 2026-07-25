let currentToken = localStorage.getItem("docsage_token") || null;
let currentConversationId = null;

const authBox = document.getElementById("authBox");
const appBox = document.getElementById("appBox");
const authError = document.getElementById("authError");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const welcomeMsg = document.getElementById("welcomeMsg");
const logoutBtn = document.getElementById("logoutBtn");

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");
const documentsList = document.getElementById("documentsList");

const chatMessages = document.getElementById("chatMessages");
const questionInput = document.getElementById("questionInput");
const askBtn = document.getElementById("askBtn");

loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  loginForm.style.display = "block";
  signupForm.style.display = "none";
  authError.textContent = "";
});

signupTab.addEventListener("click", () => {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  signupForm.style.display = "block";
  loginForm.style.display = "none";
  authError.textContent = "";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      authError.textContent = data.message;
      return;
    }

    currentToken = data.token;
    localStorage.setItem("docsage_token", currentToken);
    showApp(data.user.name);
  } catch (err) {
    authError.textContent = "Something went wrong. Please try again.";
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";

  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  try {
    const res = await fetch("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      authError.textContent = data.message;
      return;
    }

    currentToken = data.token;
    localStorage.setItem("docsage_token", currentToken);
    showApp(data.user.name);
  } catch (err) {
    authError.textContent = "Something went wrong. Please try again.";
  }
});

function showApp(name) {
  authBox.style.display = "none";
  appBox.style.display = "block";
  document.body.classList.add("app-active");
  welcomeMsg.textContent = `Welcome, ${name}!`;
  loadDocuments();
}

if (currentToken) {
  fetch("/auth/me", {
    headers: { Authorization: `Bearer ${currentToken}` },
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => showApp(data.user.name))
    .catch(() => {
      localStorage.removeItem("docsage_token");
      currentToken = null;
    });
}

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Please choose a file first.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  uploadStatus.textContent = "Uploading...";

  try {
    const res = await fetch("/documents/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      uploadStatus.textContent = data.message;
      return;
    }

    uploadStatus.textContent = "Uploaded! Processing in background...";
    fileInput.value = "";
    loadDocuments();
  } catch (err) {
    uploadStatus.textContent = "Upload failed. Please try again.";
  }
});

async function loadDocuments() {
  try {
    const res = await fetch("/documents", {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const data = await res.json();

    documentsList.innerHTML = "";
    data.documents.forEach((doc) => {
      const div = document.createElement("div");
      div.className = "doc-item";
      div.innerHTML = `
        <span>${doc.originalName}</span>
        <span class="status-${doc.embeddingStatus}">${doc.embeddingStatus}</span>
      `;
      documentsList.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load documents", err);
  }
}

askBtn.addEventListener("click", sendQuestion);
questionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendQuestion();
});

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question) return;

  addMessageToChat("user", question);
  questionInput.value = "";

  try {
    const res = await fetch("/chat/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        question,
        conversationId: currentConversationId,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      addMessageToChat("assistant", data.message || "Something went wrong.");
      return;
    }

    currentConversationId = data.conversationId;
    addMessageToChat("assistant", data.answer, data.sources);
  } catch (err) {
    addMessageToChat("assistant", "Something went wrong. Please try again.");
  }
}

function addMessageToChat(role, content, sources) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = content;

  if (sources && sources.length > 0) {
    const sourcesDiv = document.createElement("div");
    sourcesDiv.className = "sources";
    sourcesDiv.textContent = `Based on ${sources.length} source chunk(s), similarity: ${sources[0].similarityScore.toFixed(3)}`;
    div.appendChild(sourcesDiv);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("docsage_token");
  currentToken = null;
  currentConversationId = null;
  chatMessages.innerHTML = "";
  documentsList.innerHTML = "";
  appBox.style.display = "none";
  authBox.style.display = "block";
  document.body.classList.remove("app-active");
});