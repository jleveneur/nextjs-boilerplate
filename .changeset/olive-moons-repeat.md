---
"@repo/email": minor
"@repo/i18n": minor
"@repo/auth": minor
---

Render transactional emails from localized React Email templates.

`@repo/i18n` gains `negotiateLocale` / `negotiateLocaleFromRequest`, which pick a
supported locale from the `NEXT_LOCALE` cookie and `Accept-Language` without
depending on next-intl, so the worker can use them too.

`@repo/auth` resolves that locale from the request Better Auth hands its
callbacks and adds it to `SendVerificationEmailInput`, `SendMagicLinkInput` and
`SendInvitationEmailInput`. **Breaking for direct consumers of those types**, in
the sense that the callbacks now receive one more field.

`@repo/email` gains `VerifyEmail`, `MagicLinkEmail` and `InvitationEmail`
templates plus `buildVerifyEmail` / `buildMagicLinkEmail` /
`buildInvitationEmail` / `buildWelcomeEmail`, which return the `subject` and
`react` element together so a translated body cannot ship under an English
subject. `WelcomeEmail` is localized and moved onto the shared layout.
