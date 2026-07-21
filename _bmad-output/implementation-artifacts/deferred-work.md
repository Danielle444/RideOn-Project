# Deferred Work

- source_spec: none
  summary: Restructure SecretaryClassesOverviewTable.jsx into three collapsible column groups (arena + judges, financial, schedule) — Phase 7 item 4, audit finding 3.
  evidence: Split from the Phase 7 intent on Oren's explicit sequencing. Items 1/2/3/5 all change computed schedule times; item 4 is a pure presentation restructure with no schedule-math risk. Kept apart so a math regression cannot hide behind a presentation change during verification.

- source_spec: none
  summary: Log the parked future feature — secretary sets per-class minutes-per-entry generally, not only for extreme — to the QA tracker in the standard bug-creation JSON format.
  evidence: Split from the Phase 7 intent. Tracker-logging chore with no code deliverable; independent of every schedule change. Latest tracker issue is 39; items 37-39 are parked/blocked and unrelated.
