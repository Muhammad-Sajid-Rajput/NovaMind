// NovaMind — CodeBlock.jsx — File Upload Bug Fix

export function escapeHtml(html) {
  if (!html) return "";
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderCodeHtml(code, lang) {
  const displayLang = lang || "plaintext";
  const encoded = encodeURIComponent(code || "");
  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-lang">${displayLang}</span>
        <button class="code-block-copy-btn" onclick="if (this.disabled) return; navigator.clipboard.writeText(decodeURIComponent('${encoded}')); const btn = this; btn.innerText = '✓ Copied!'; btn.disabled = true; btn.style.cursor = 'not-allowed'; setTimeout(() => { btn.innerText = 'Copy'; btn.disabled = false; btn.style.cursor = 'pointer'; }, 5000)">
          Copy
        </button>
      </div>
      <pre><code class="language-${displayLang}">${escapeHtml(code)}</code></pre>
    </div>
  `;
}
