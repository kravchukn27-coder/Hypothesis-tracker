# Tech Backlog

## TECH-002 — Merge Experiment Status and Stage into one field

**Status:** TODO
**Priority:** HIGH
**Summary:** `Experiment` currently has two separate fields — `status`
(Dev/Experiment/Done) and `stage` (Discovery/Design/Development/
Experimentation/Analysis). Per the user, this split was a mistake
carried over from the source Excel sheet — they're conceptually the
same thing and should be a single field with one name and one color
set everywhere (list, detail form, Calendar).

**Description:** Source: user direction 2026-08-06, describing this as
an error in how the original spreadsheet modeled experiments, not a
deliberate distinction worth keeping. The Calendar screen currently
shows the *stage* value on each bar — after the merge, it shows the
same single field, just still called "stage" in that context per the
user ("in the calendar it's displayed as stage, but it's the same
status").

**Open question, needs the user's call before implementation:** what
is the resulting unified value set? Current `status` values are `DEV`/
`EXPERIMENT`/`DONE`; current `stage` values are `DISCOVERY`/`DESIGN`/
`DEVELOPMENT`/`EXPERIMENTATION`/`ANALYSIS`. These aren't the same list
today — the merge needs a decided target list, not just a rename.

**Acceptance Criteria:**
- One field, one name, used consistently in the Experiments list,
  create/edit form, and Calendar — not two parallel fields.
- Same label text and same color per value everywhere it's shown.
- Calendar bars/labels keep working using this single field.
