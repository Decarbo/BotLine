// DOM elements ko select kar rahe hain
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = fileUploadWrapper.querySelector("#file-cancel");

const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// User ke message aur file ko store karne ke liye object
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

// Chat history maintain karne ke liye array
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// Ek naya message element banata hai (bot/user dono ke liye)
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Bot ka response API se fetch karna
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  // User ke message ko chat history mein daalo
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: userData.file }] : [])],
  });

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: chatHistory }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();

    // Error handling
    if (API_KEY === "YOUR_API_KEY_HERE") throw new Error("API Key not configured.");
    if (!response.ok) throw new Error(data.error?.message || "Unknown API error.");
    if (!data.candidates?.[0]?.content?.parts?.[0]) throw new Error("Invalid response structure.");

    // Response formatting (bold, italics, newline)
    let apiResponseText = data.candidates[0].content.parts[0].text;
    apiResponseText = apiResponseText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").trim();
    apiResponseText = apiResponseText.replace(/\*(.*?)\*/g, "<em>$1</em>").trim();
    apiResponseText = apiResponseText.replace(/\n/g, "<br>");

    messageElement.innerHTML = apiResponseText;

    // Bot ka response bhi chat history mein daalna
    chatHistory.push({
      role: "model",
      parts: [{ text: data.candidates[0].content.parts[0].text }],
    });
  } catch (error) {
    console.error("API Error:", error);
    messageElement.innerHTML = `Oops! Something went wrong: <br><span style="color: #D32F2F; font-size: 0.9em;">${error.message}</span>`;
    messageElement.classList.add("error-message");
  } finally {
    // File data clear karna aur chat scroll karna
    userData.file = {};
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

// User ke message ko send karne ka kaam karta hai
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();

  if (!userData.message && !userData.file.data) return;

  const userMessageText = userData.message;
  messageInput.value = "";
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.dispatchEvent(new Event("input"));

  fileUploadWrapper.classList.remove("file-uploaded");
  fileUploadWrapper.querySelector("img").src = "#";

  const messageContent = `<div class="message-text"></div>
    ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" alt="User attachment"/>` : ""}`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userMessageText;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  setTimeout(() => {
    const botMessageContent = `
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>`;
    const incomingMessageDiv = createMessageElement(botMessageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Textarea height auto adjust karna
messageInput.addEventListener("input", () => {
  messageInput.style.height = `auto`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight + 10 ? "15px" : "32px";
});

// Enter dabane par message bhejna (mobile devices ko exclude karta hai)
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
    if (messageInput.value.trim() || userData.file.data) {
      handleOutgoingMessage(e);
    }
  }
});

// File select hone par uska preview dikhana
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file (JPG, PNG, etc.)");
    fileInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("File is too large. Max 5MB allowed.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const base64String = e.target.result.split(",")[1];

    userData.file = {
      data: base64String,
      mime_type: file.type,
    };

    messageInput.dispatchEvent(new Event("input"));
  };
  reader.readAsDataURL(file);
});

// File upload cancel karne ka handler
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
  fileUploadWrapper.querySelector("img").src = "#";
  messageInput.dispatchEvent(new Event("input"));
});

// Emoji picker initialization
const emojiPickerElement = document.querySelector("#emoji-picker");
const picker = new EmojiMart.Picker({
  data: async () => {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
    return response.json();
  },
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
    messageInput.dispatchEvent(new Event("input"));
    document.body.classList.remove("show-emoji-picker");
  },
  onClickOutside: (e) => {
    if (!e.target.closest("em-emoji-picker") && !e.target.closest("#emoji-picker")) {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});
document.querySelector(".chat-form").appendChild(picker);

// Emoji picker toggle
emojiPickerElement.addEventListener("click", (e) => {
  e.stopPropagation();
  document.body.classList.toggle("show-emoji-picker");
});

// Send button click par message bhejna
sendMessage.addEventListener("click", (e) => {
  if (messageInput.value.trim() || userData.file.data) {
    handleOutgoingMessage(e);
  }
});

// File upload button click par file input trigger karna
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

// Chatbot close/toggle buttons ka handling
const closeChatbotBtn = document.querySelector("#close-chatbot");
if (closeChatbotBtn) {
  closeChatbotBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
}

const chatbotTogglerBtn = document.querySelector("#chatbot-toggler");
if (chatbotTogglerBtn) {
  chatbotTogglerBtn.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
}
