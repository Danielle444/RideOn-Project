-- Rollback for the 2026-07-26 "draft everything not in the files" change.
-- Restores each competition's exact prior status. Run only to revert.
UPDATE competition SET competitionstatus = 'הסתיימה' WHERE competitionid = 1;
UPDATE competition SET competitionstatus = 'עתידית'  WHERE competitionid = 2;
UPDATE competition SET competitionstatus = 'פעילה'   WHERE competitionid = 3;
UPDATE competition SET competitionstatus = 'כעת'     WHERE competitionid = 4;
UPDATE competition SET competitionstatus = 'טיוטה'   WHERE competitionid IN (5, 6);
UPDATE competition SET competitionstatus = 'Draft'   WHERE competitionid IN (39, 40, 42, 43, 49, 50);
UPDATE competition SET competitionstatus = NULL      WHERE competitionid IN (7, 8, 41, 44, 45, 46, 47, 48);
