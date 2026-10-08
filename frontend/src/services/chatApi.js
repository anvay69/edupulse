import { apiRequest } from "./api.js";

export function sendChatMessage(studentId, message) {
  return sendConversationMessage(studentId, message, null);
}

export function sendConversationMessage(studentId, message, conversationId) {
  return apiRequest("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      message,
      conversation_id: conversationId,
    }),
  });
}

export function getConversations() {
  return apiRequest("/chat/conversations");
}

export function createConversation() {
  return apiRequest("/chat/conversations", { method: "POST" });
}

export function getConversationMessages(conversationId) {
  return apiRequest(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}
