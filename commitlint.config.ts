import type { UserConfig } from "@commitlint/types";

/**
 * Conventional Commits. Because we squash-merge, the PR title becomes the commit
 * message, so this is what keeps `main`'s history readable and makes `git bisect`
 * meaningful. See docs/architecture/04-conventions.md#7-commits-branches-prs.
 */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // A new capability
        "fix", // A bug fix
        "perf", // A performance improvement
        "refactor", // No behaviour change
        "docs", // Documentation only
        "test", // Tests only
        "build", // Build system, dependencies, tooling config
        "ci", // Pipelines
        "chore", // Maintenance with no src or test change
        "revert",
      ],
    ],
    // Scopes are package or app names without the @repo/ prefix. Left open
    // rather than enumerated so adding a package does not require editing this
    // file — an enum here would go stale and start blocking valid commits.
    "scope-case": [2, "always", "kebab-case"],
    "subject-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
    "footer-leading-blank": [2, "always"],
  },
};

export default config;
