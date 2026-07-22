-- Phase 8 financial layer: tack-stall uplift ratio (1 tack stall per 3-5 horses).
-- Read at derivation time like shavingsperstallmin/max; frontend falls back to 3/5
-- if these rows are absent, so this seed is non-blocking.
-- Applied live 2026-07-22 (migration: phase8_tackstall_ratio_config).
INSERT INTO smartconfig (configkey, configvalue, valuetext, description) VALUES
  ('tackstallhorsesperunitmin', 3, NULL,
   'Tack stall uplift, lower horses-per-tack-stall bound. 1 tack (equipment) stall per 3-5 horses; min=3 drives the UPPER tack-count endpoint (ceil(horses/3)). Low-confidence: rests on a 7/23 stallbooking sample as of 2026-07-22 — retune from fuller history.'),
  ('tackstallhorsesperunitmax', 5, NULL,
   'Tack stall uplift, upper horses-per-tack-stall bound. 1 tack (equipment) stall per 3-5 horses; max=5 drives the LOWER tack-count endpoint (floor(horses/5)). Low-confidence: rests on a 7/23 stallbooking sample as of 2026-07-22 — retune from fuller history.')
ON CONFLICT (configkey) DO NOTHING;
