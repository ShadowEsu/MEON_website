// Opening hours in the Restaurant schema only while they're freshly checked (Security SHOULD-MS1, 2 Nov 2026): the schema
// can't carry the page's "the latest are on our Instagram" note, so once data/site.json hoursSource.checked is more than
// 90 days old the build leaves the hours out of the schema (the visible table stays, with check.mjs's 6-month note).
// This is decided at build time: re-check the hours, update `checked` and redeploy to bring them back.
export const SCHEMA_HOURS_MAX_DAYS = 90;

export const schemaHoursFresh = (hoursSource, now = Date.now()) => {
  const checked = Date.parse(hoursSource?.checked || "");
  return Number.isFinite(checked) && (now - checked) / 864e5 <= SCHEMA_HOURS_MAX_DAYS;
};

// The moment the same 90 days run out, as an ISO time, or null without a readable `checked`. The home page's today line
// carries it (data-hours-until) so site.js drops "Open today …" in the visitor's browser once it passes, even if nobody
// rebuilds (Security SHOULD-MF5, 2 Nov 2026). Same rule as schemaHoursFresh: fresh while now <= checked + 90 days.
export const hoursFreshUntil = (hoursSource) => {
  const checked = Date.parse(hoursSource?.checked || "");
  return Number.isFinite(checked) ? new Date(checked + SCHEMA_HOURS_MAX_DAYS * 864e5).toISOString() : null;
};
