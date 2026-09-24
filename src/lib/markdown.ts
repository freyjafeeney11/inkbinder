/**
 * A deliberately small markdown -> HTML renderer covering the subset a
 * novelist actually uses: headings, emphasis, blockquotes, lists, rules,
 * and paragraphs. No remote dependency, so `npm install` never needs to
 * reach further than this repo for the preview pane to work.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }
  function closeList() {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeList();
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      closeList();
      html.push("<hr/>");
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (inList !== "ul") {
        closeList();
        html.push("<ul>");
        inList = "ul";
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushParagraph();
      if (inList !== "ol") {
        closeList();
        html.push("<ol>");
        inList = "ol";
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();

  return html.join("\n");
}
