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
// column wider than its nominal class if the class is too small — one
// real minimum drove the Action column's number below, found by
// checking actual rendered width rather than trusting the nominal
// class: a 36px icon button (size-9) + cell padding needs 80px, not
// the 48px "w-12" would suggest.
// Backlog's page container was widened to `max-w-6xl` (was
// `max-w-5xl`) to match Experiments' at the time both totals were
// tuned to line up exactly; UI-018 (2026-08-09) shrank DATE_COL after
// replacing its raw start/end date inputs with a compact week-range
// label, so the two tables' totals no longer intentionally match —
// that equality was never a product requirement, just a BUG-004
// nicety, and shrinking a column can't reintroduce the horizontal
// scroll BUG-004 actually cared about.
// Backlog total = CHECKBOX+NAME+STATUS+FUNNEL_LEVEL+META+COMMENT+ACTION
//               = 32+256+176+176+128+160+80 = 1008px
// Experiments total = CHECKBOX+NAME+STATUS+META+LONG_TEXT+DATE
//                    = 32+256+176+128+128+128 = 848px
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
// UI-018: was `w-72` (288px) for the old side-by-side date inputs —
// its replacement (a short week-range label, e.g. "32–35 нед.") needs
// far less room.
export const DATE_COL = "w-32";
// 80px, not the 48px the class name's nominal size suggests — see the
// Action-column note above.
export const ACTION_COL = "w-20";
// Bulk-select checkbox column (PROD-018) — only rendered while
// selection mode is active, so it can stay narrow.
export const CHECKBOX_COL = "w-8";

// UI-023: the Backlog table with two rows is the visual reference for
// every tabular screen. The outer surface is vertically scrollable;
// table data must never resize it or introduce horizontal scrolling.
export const TABLE_SURFACE_WIDTH = "w-full min-w-0 max-w-[1014px]";
export const TABLE_CONTENT_WIDTH = "w-full min-w-0";
export const TABLE_SURFACE_HEIGHT = "h-[164px]";
