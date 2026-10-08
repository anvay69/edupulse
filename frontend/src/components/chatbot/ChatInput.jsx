import { useState } from "react";

export default function ChatInput({ disabled, onSubmit }) {
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const submittedMessage = message.trim();
    if (!submittedMessage || disabled) return;
    setMessage("");
    await onSubmit(submittedMessage);
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="chat-question">Ask EduPulse AI</label>
      <textarea
        id="chat-question"
        rows="2"
        maxLength="2000"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Ask about your documents or academic updates…"
        disabled={disabled}
      />
      <button className="workspace-primary-button" type="submit" disabled={disabled || !message.trim()}>
        {disabled ? "Thinking…" : "Ask"}
      </button>
    </form>
  );
}
