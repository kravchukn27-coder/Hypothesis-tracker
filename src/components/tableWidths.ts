// Shared column-width system (UI-008) for the Backlog and Experiments
// tables — explicit widths instead of each table's own ad hoc
// max-w-*/truncate choices, so both read as one consistent product.
//
// BUG-004 (2026-08-09): both tables must render at the SAME fixed
// total width with no horizontal scroll — narrow tag/badge columns
// (Funnel Level, Segment) don't need Comment-sized room, they just
// need to fit their actual content without wrapping.
//
// `table-fixed` still lets a cell's unshrinkable content force that
// column wider than its nominal class if the class is too small — two
// real minimums drove the final numbers below, found by checking
// actual rendered widths rather than trusting the nominal classes:
// - Action column: a 36px icon button (size-9) + cell padding needs
//   80px, not the 48px "w-12" would suggest.
// - Experiments' Даты column: two side-by-side `<input type="date">`
//   elements have a native rendering floor around 281px regardless of
//   a smaller class — DATE_COL is set to clear that.
// That Date floor is wider than anything Backlog needs, so matching
// totals meant widening Backlog's page container to Experiments'
// `max-w-6xl` (was `max-w-5xl`) rather than starving Backlog's columns
// to fit the old, narrower one.
// Backlog total = CHECKBOX+NAME+STATUS+FUNNEL_LEVEL+META+COMMENT+ACTION
//               = 32+256+176+176+128+160+80 = 1008px
// Experiments total = CHECKBOX+NAME+STATUS+META+LONG_TEXT+DATE
//                    = 32+256+176+128+128+288 = 1008px
export const NAME_COL = "w-64";
// 176px, not 160 — Experiments' longest Stage option ("Experimentation")
// needs the extra room; applied to both tables for one shared width.
export const STATUS_COL = "w-44";
export const META_COL = "w-32";
// Experiments' Segment column — narrow tag/badge content, not prose.
export const LONG_TEXT_COL = "w-32";
// Backlog's Funnel Level column (UI-015) — sized for its `Badge`
// content (longest real value so far, "Cancel Subscription", is
// ~123px), not a comfortable-reading-width like Comment.
export const FUNNEL_LEVEL_COL = "w-44";
export const COMMENT_COL = "w-40";
export const DATE_COL = "w-72";
// 80px, not the 48px the class name's nominal size suggests — see the
// Action-column note above.
export const ACTION_COL = "w-20";
// Bulk-select checkbox column (PROD-018) — only rendered while
// selection mode is active, so it can stay narrow.
export const CHECKBOX_COL = "w-8";
