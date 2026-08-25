---
"@repo/core": patch
---

Authorize `invoice:void` before reading the invoice, so an unauthorized caller cannot probe invoice existence.
