import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConversationMessages,
  getConversations,
  sendConversationMessage,
} from "../../services/chatApi.js";
import ChatHistory from "./ChatHistory.jsx";
import ChatInput from "./ChatInput.jsx";
import ChatMessage from "./ChatMessage.jsx";
import SuggestedQuestions from "./SuggestedQuestions.jsx";

export default function Chatbot({ studentId, onSourceSelect }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const selectionRequest = useRef(0);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await getConversations());
      setHistoryError("");
    } catch (error) {
      setHistoryError(error.message);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  async function openConversation(id) {
    if (id === conversationId || loading) return;
    const requestId = ++selectionRequest.current;
    setLoading(true);
    setMessagesLoading(true);
    setHistoryError("");
    setConversationId(id);
    setMessages([]);
    try {
      const savedMessages = await getConversationMessages(id);
      if (selectionRequest.current !== requestId) return;
      setMessages(savedMessages.map((message) => ({
        role: message.role === "student" ? "student" : "assistant",
        text: message.content,
        sources: message.sources || [],
      })));
    } catch (error) {
      if (selectionRequest.current === requestId) setHistoryError(error.message);
    } finally {
      if (selectionRequest.current === requestId) {
        setMessagesLoading(false);
        setLoading(false);
      }
    }
  }

  function startNewChat() {
    if (loading) return;
    selectionRequest.current += 1;
    setConversationId(null);
    setMessages([]);
    setHistoryError("");
    setMessagesLoading(false);
  }

  async function askQuestion(question) {
    if (loading) return;
    const activeConversationId = conversationId;
    setMessages((current) => [...current, { role: "student", text: question }]);
    setLoading(true);
    try {
      const result = await sendConversationMessage(studentId, question, activeConversationId);
      setConversationId(result.conversation_id);
      setMessages((current) => [...current, {
        role: "assistant",
        text: result.answer,
        sources: result.sources || [],
      }]);
      await refreshConversations();
    } catch (error) {
      setMessages((current) => [...current, { role: "error", text: error.message }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  }

  return (
    <section className="workspace-panel chatbot-panel" aria-labelledby="chatbot-title">
      <div className="workspace-panel-heading">
        <div>
          <p className="eyebrow">ASK WHEN YOU NEED HELP</p>
          <h2 id="chatbot-title">EduPulse AI</h2>
          <p className="chatbot-subtitle">Ask questions about your academic information and documents.</p>
        </div>
        <span className="chat-assistant-mark" aria-hidden="true">AI</span>
      </div>
      <div className="chat-workspace">
        <ChatHistory
          conversations={conversations}
          selectedId={conversationId}
          loading={loading}
          error={historyError}
          onNewChat={startNewChat}
          onSelect={openConversation}
        />
        <div className="chat-conversation">
          <div className="chat-messages" aria-live="polite">
            {messagesLoading ? (
              <p className="chat-loading" role="status">Loading conversation…</p>
            ) : messages.length === 0 ? (
              <div className="chat-empty-state">
                <span aria-hidden="true">✳</span>
                <h3>Ask a question about your documents</h3>
                <p>Your new chat is ready. The assistant responds only after you send a question.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={`${message.role}-${index}`}
                  message={message}
                  studentId={studentId}
                  onSourceSelect={onSourceSelect}
                />
              ))
            )}
            {loading && !messagesLoading && <p className="chat-loading" role="status">EduPulse AI is checking your available sources…</p>}
            <span ref={messagesEndRef} />
          </div>
          <SuggestedQuestions disabled={loading} onChoose={askQuestion} />
          <ChatInput disabled={loading || messagesLoading} onSubmit={askQuestion} />
        </div>
      </div>
    </section>
  );
}
