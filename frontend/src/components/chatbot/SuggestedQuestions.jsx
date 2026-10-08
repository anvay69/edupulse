const suggestions = [
  "What is the deadline mentioned in this document?",
  "What do I need to submit?",
  "Summarize this document.",
  "When is my DBMS assignment due?",
];

export default function SuggestedQuestions({ disabled, onChoose }) {
  return (
    <div className="suggested-questions" aria-label="Suggested questions">
      <p>TRY ASKING</p>
      <div>
        {suggestions.map((question) => (
          <button key={question} type="button" disabled={disabled} onClick={() => onChoose(question)}>
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
