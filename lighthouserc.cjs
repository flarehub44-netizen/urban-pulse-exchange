/** @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md */
module.exports = {
  ci: {
    collect: {
      url: [
        `${process.env.LHCI_BASE_URL || "http://127.0.0.1:4173"}/`,
        `${process.env.LHCI_BASE_URL || "http://127.0.0.1:4173"}/markets?status=live`,
      ],
      numberOfRuns: 2,
      settings: {
        preset: "desktop",
        throttlingMethod: "simulate",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.6 }],
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 5000 }],
        "total-blocking-time": ["warn", { maxNumericValue: 800 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.12 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
