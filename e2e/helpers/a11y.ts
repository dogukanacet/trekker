import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Only the worst findings fail the run; minor ones stay visible in the report but do not block releases.
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".leaflet-container") // third-party map tiles and controls
    .analyze();

  const blocking = results.violations
    .filter((violation) => violation.impact && BLOCKING_IMPACTS.has(violation.impact))
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}; ${violation.nodes.length} node(s), ` +
        `first: ${String(violation.nodes[0]?.target)}`,
    );

  expect(blocking, `Accessibility violations on ${page.url()}`).toEqual([]);
}
