// Opening hours in the Restaurant schema only while they're freshly checked (Security SHOULD-MS1, 2 Nov 2026): the schema
// can't carry the page's "the latest are on our Instagram" note, so once data/site.json hoursSource.checked is more than
// 90 days old the build leaves the hours out of the schema (the visible table stays, with check.mjs's 6-month note).
// This is decided at build time: re-check the hours, update `checked` and redeploy to bring them back.
export const SCHEMA_HOURS_MAX_DAYS = 90;

export const schemaHoursFresh = (hoursSource, now = Date.now()) => {
  const checked = Date.parse(hoursSource?.checked || "");
  return Number.isFinite(checked) && (now - checked) / 864e5 <= SCHEMA_HOURS_MAX_DAYS;
};
