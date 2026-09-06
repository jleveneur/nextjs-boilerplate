---
"@repo/utils": minor
---

Add `escapeHtml` for values interpolated into string-built markup.

Transactional email bodies are assembled with template literals, which is the one
path in the repo where an input reaches a rendered output without a renderer that
escapes for it. `escapeHtml` covers the five characters that change meaning in
HTML and is safe for both text content and quoted attribute values.
