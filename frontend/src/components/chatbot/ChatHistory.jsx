export default function ChatHistory({
  conversations,
  selectedId,
  loading,
  error,
  onNewChat,
  onSelect,
}) {
  return (
    <aside className="chat-history-sidebar" aria-label="Previous chats">
      <button
        className="chat-new-button"
        type="button"
        onClick={onNewChat}
        disabled={loading}
      >
        <span aria-hidden="true">+</span> New chat
      </button>
      <p className="chat-history-label">RECENT CHATS</p>
      {error ? (
        <p className="chat-history-message" role="alert">{error}</p>
      ) : conversations.length === 0 ? (
        <p className="chat-history-message">
          {loading ? "Loading chats…" : "Your conversations will appear here."}
        </p>
      ) : (
        <div className="chat-history-list">
          {conversations.map((conversation) => (
            <button
              className={`chat-history-item${selectedId === conversation.id ? " chat-history-item--active" : ""}`}
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              disabled={loading}
              aria-current={selectedId === conversation.id ? "true" : undefined}
            >
              <strong>{conversation.title}</strong>
              {conversation.preview && <span>{conversation.preview}</span>}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
