const INLINE_MARKDOWN =
  /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)]+\))/g;
const LINK_MARKDOWN = /^\[([^\]]+)\]\(([^)]+)\)$/;

function renderInline(text, keyPrefix) {
  const nodes = [];
  let previousEnd = 0;

  for (const [index, match] of [...text.matchAll(INLINE_MARKDOWN)].entries()) {
    const start = match.index;
    if (start > previousEnd) {
      nodes.push(text.slice(previousEnd, start));
    }

    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    const link = token.match(LINK_MARKDOWN);
    if (link) {
      const [, label, rawUrl] = link;
      let safeUrl;
      try {
        const url = new URL(rawUrl, window.location.href);
        if (url.protocol === "http:" || url.protocol === "https:") safeUrl = url.href;
      } catch {
        safeUrl = undefined;
      }
      nodes.push(safeUrl
        ? <a key={key} href={safeUrl} target="_blank" rel="noreferrer">{label}</a>
        : label);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    previousEnd = start + token.length;
  }

  if (previousEnd < text.length) nodes.push(text.slice(previousEnd));
  return nodes;
}

function isUnorderedItem(line) {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrderedItem(line) {
  return /^\s*\d+[.)]\s+/.test(line);
}

export default function MarkdownText({ children }) {
  const lines = String(children ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length || !listType) return;
    blocks.push({ type: listType, items: listItems });
    listItems = [];
    listType = null;
  }

  for (const line of lines) {
    const unordered = isUnorderedItem(line);
    const ordered = isOrderedItem(line);
    const nextListType = unordered ? "unordered-list" : ordered ? "ordered-list" : null;

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (nextListType) {
      flushParagraph();
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ""));
      continue;
    }

    flushList();
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
    } else if (/^\s{0,3}(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "rule" });
    } else {
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  flushList();

  return (
    <div className="chat-markdown">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.type === "heading") {
          const Heading = `h${Math.min(block.level, 4)}`;
          return <Heading key={key}>{renderInline(block.text, key)}</Heading>;
        }
        if (block.type === "unordered-list" || block.type === "ordered-list") {
          const List = block.type === "unordered-list" ? "ul" : "ol";
          return (
            <List key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </List>
          );
        }
        if (block.type === "rule") return <hr key={key} />;
        return (
          <p key={key}>
            {block.lines.map((line, lineIndex) => (
              <span key={`${key}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `${key}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
