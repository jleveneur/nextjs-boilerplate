/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      startServerReadyPattern: "Ready",
      // Authenticated app routes need a session; public surfaces gate this phase.
      // chromePath is passed via `make lighthouse` (--collect.settings / env).
      url: ["http://127.0.0.1:3000/en", "http://127.0.0.1:3000/en/sign-in"],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        // GitHub-hosted runners (and many Linux CI images) disable unprivileged
        // user namespaces, so Chromium cannot start its sandbox.
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.5 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.7 }],
        "categories:seo": ["warn", { minScore: 0.7 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
