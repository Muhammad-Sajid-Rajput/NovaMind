// NovaMind — MarkdownRenderer.jsx
// Stands as a separate, lazy-loaded component to encapsulate highlight.js, marked, and dompurify.
// Optimized with useMemo to cache parsed results and defer syntax highlighting until streaming finishes.

import React, { memo, useMemo } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.min.css";
import DOMPurify from "dompurify";
import { marked, Renderer } from "marked";

function MarkdownRenderer({ text, searchQuery, isStreaming }) {
  // 1. Dynamic custom code block renderer based on streaming state
  const renderer = useMemo(() => {
    const r = new Renderer();

    r.code = (codeOrObj, info) => {
      let code = "";
      let lang = "";
      if (codeOrObj && typeof codeOrObj === "object") {
        code = codeOrObj.text || "";
        lang = codeOrObj.lang || "";
      } else {
        code = codeOrObj || "";
        lang = info || "";
      }
      const displayLang = lang || "plaintext";

      // If actively streaming, render as plain escaped text to avoid CPU jank
      if (isStreaming) {
        const escaped = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        return `
          <div class="code-block-wrapper">
            <div class="code-block-header">
              <span class="code-lang">${displayLang}</span>
              <button
                class="copy-code-btn"
                data-code="${encodeURIComponent(code)}"
              >
                Copy
              </button>
            </div>
            <pre><code class="language-${displayLang}">${escaped}</code></pre>
          </div>
        `;
      }

      // Once streaming finishes, run highlight.js for proper syntax coloring
      const validLang = hljs.getLanguage(displayLang) ? displayLang : "plaintext";
      const highlighted = hljs.highlight(code, { language: validLang }).value;

      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${displayLang}</span>
            <button
              class="copy-code-btn"
              data-code="${encodeURIComponent(code)}"
            >
              Copy
            </button>
          </div>
          <pre><code class="hljs language-${displayLang}">${highlighted}</code></pre>
        </div>
      `;
    };

    return r;
  }, [isStreaming]);

  // 2. Parse Markdown to HTML
  const rawHtml = useMemo(() => {
    let cleanText = text || "";

    if (searchQuery && searchQuery.trim() !== "") {
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      cleanText = cleanText.replace(regex, `<mark class="search-highlight">$1</mark>`);
    }

    let html = marked.parse(cleanText, { renderer, breaks: true, gfm: true });

    // Wrap tables in responsive containers
    html = html.replace(/<table>/g, '<div class="table-container"><table>').replace(/<\/table>/g, '</table></div>');
    return html;
  }, [text, searchQuery, renderer]);

  // 3. Sanitize HTML to prevent XSS
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "code", "pre",
        "ul", "ol", "li", "blockquote", "h1", "h2",
        "h3", "h4", "h5", "h6", "a", "span", "div",
        "table", "thead", "tbody", "tr", "th", "td",
        "hr", "mark",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel", "class", "style", "data-code"
      ]
    });
  }, [rawHtml]);

  return <div className="bot-markdown" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export default memo(MarkdownRenderer);
