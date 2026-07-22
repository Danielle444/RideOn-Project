-- Phase 8 financial layer: tack-stall uplift ratio (1 tack stall per 4-5 horses).
-- Read at derivation time like shavingsperstallmin/max; frontend falls back to 4/5
-- if these rows are absent, so this seed is non-blocking.
-- Applied live 2026-07-22 (migration: phase8_tackstall_ratio_config) at 3-5, then
-- narrowed to 4-5 on 2026-07-23 (migration: phase8_tack_ratio_min_4) at Oren's request.
INSERT INTO smartconfig (configkey, configvalue, valuetext, description) VALUES
  ('tackstallhorsesperunitmin', 4, NULL,
   'Tack stall uplift, lower horses-per-tack-stall bound. 1 tack (equipment) stall per 4-5 horses; min=4 drives the UPPER tack-count endpoint (ceil(horses/4)). Low-confidence: rests on a 7/23 stallbooking sample as of 2026-07-22 — retune from fuller history.'),
  ('tackstallhorsesperunitmax', 5, NULL,
   'Tack stall uplift, upper horses-per-tack-stall bound. 1 tack (equipment) stall per 4-5 horses; max=5 drives the LOWER tack-count endpoint (floor(horses/5)). Low-confidence: rests on a 7/23 stallbooking sample as of 2026-07-22 — retune from fuller history.')
ON CONFLICT (configkey) DO NOTHING;

-- 2026-07-23 narrowing (min 3 -> 4). Idempotent-safe to re-run.
UPDATE smartconfig SET configvalue = 4 WHERE configkey = 'tackstallhorsesperunitmin';
