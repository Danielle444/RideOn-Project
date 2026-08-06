using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.BL.Services
{
    public static class DrawOrderGenerator
    {
        private const int MaxAttempts = 2500;

        // Candidate unit is a physical run (rider+horse+classDate+orderInDay),
        // not a raw entry row -- a run covering several classifications is one
        // arena pass and must occupy exactly one slot, so two classifications of
        // the same run are never scored as two separate rider/horse appearances.
        // Every active entry linked to a run receives that run's shared
        // DrawOrder when the candidate is expanded back into preview rows.
        public static GroupDrawOrderPreviewResponse GeneratePreview(
            List<PhysicalRunGroup> runs,
            short minimumGap)
        {
            if (runs == null || runs.Count == 0)
            {
                throw new Exception("No entries found for draw group");
            }

            if (minimumGap <= 0)
            {
                minimumGap = 7;
            }

            List<PhysicalRunGroup> orderedBase =
                runs
                    .OrderBy(run => run.CreatedAt)
                    .ThenBy(run => run.MinEntryId)
                    .ToList();

            DrawCandidate bestCandidate =
                BuildCandidate(orderedBase, minimumGap);

            Random random = new Random();

            for (int attempt = 0; attempt < MaxAttempts; attempt++)
            {
                List<PhysicalRunGroup> shuffled =
                    ShuffleRuns(orderedBase, random);

                DrawCandidate candidate =
                    BuildCandidate(shuffled, minimumGap);

                if (IsBetterCandidate(candidate, bestCandidate))
                {
                    bestCandidate = candidate;
                }

                if (bestCandidate.TotalViolations == 0)
                {
                    break;
                }
            }

            return BuildResponse(bestCandidate, minimumGap);
        }

        private static List<PhysicalRunGroup> ShuffleRuns(
            List<PhysicalRunGroup> runs,
            Random random)
        {
            List<PhysicalRunGroup> shuffled =
                runs.ToList();

            for (int i = shuffled.Count - 1; i > 0; i--)
            {
                int randomIndex = random.Next(i + 1);

                PhysicalRunGroup temp = shuffled[i];
                shuffled[i] = shuffled[randomIndex];
                shuffled[randomIndex] = temp;
            }

            return shuffled;
        }

        private static DrawCandidate BuildCandidate(
            List<PhysicalRunGroup> orderedRuns,
            short minimumGap)
        {
            DrawCandidate candidate = new DrawCandidate();

            Dictionary<int, int> lastRiderPosition =
                new Dictionary<int, int>();

            Dictionary<int, int> lastHorsePosition =
                new Dictionary<int, int>();

            Dictionary<int, int> violationsByEntity =
                new Dictionary<int, int>();

            for (int index = 0; index < orderedRuns.Count; index++)
            {
                PhysicalRunGroup run = orderedRuns[index];

                short drawOrder = Convert.ToInt16(index + 1);

                int riderGap = 0;
                int horseGap = 0;
                bool hasRiderGapWarning = false;
                bool hasHorseGapWarning = false;

                if (lastRiderPosition.ContainsKey(run.RiderFederationMemberId))
                {
                    int previousPosition =
                        lastRiderPosition[run.RiderFederationMemberId];

                    riderGap = index - previousPosition;

                    if (riderGap < minimumGap)
                    {
                        hasRiderGapWarning = true;

                        int shortage = minimumGap - riderGap;

                        candidate.TotalViolations += 1;
                        candidate.TotalShortage += shortage;

                        AddEntityViolation(
                            violationsByEntity,
                            run.RiderFederationMemberId,
                            shortage
                        );

                        candidate.Warnings.Add(
                            new GroupDrawOrderWarningItem
                            {
                                WarningType = "Rider",
                                EntityId = run.RiderFederationMemberId,
                                EntityName = run.RiderName,
                                FirstDrawOrder =
                                    Convert.ToInt16(previousPosition + 1),
                                SecondDrawOrder = drawOrder,
                                ActualGap = riderGap,
                                RequiredGap = minimumGap,
                                Message =
                                    "הרוכב/ת " +
                                    run.RiderName +
                                    " קיבל/ה רווח של " +
                                    riderGap +
                                    " כניסות במקום " +
                                    minimumGap
                            }
                        );
                    }
                }

                if (lastHorsePosition.ContainsKey(run.HorseId))
                {
                    int previousPosition =
                        lastHorsePosition[run.HorseId];

                    horseGap = index - previousPosition;

                    if (horseGap < minimumGap)
                    {
                        hasHorseGapWarning = true;

                        int shortage = minimumGap - horseGap;

                        candidate.TotalViolations += 1;
                        candidate.TotalShortage += shortage;

                        AddEntityViolation(
                            violationsByEntity,
                            run.HorseId * -1,
                            shortage
                        );

                        candidate.Warnings.Add(
                            new GroupDrawOrderWarningItem
                            {
                                WarningType = "Horse",
                                EntityId = run.HorseId,
                                EntityName = run.HorseName,
                                FirstDrawOrder =
                                    Convert.ToInt16(previousPosition + 1),
                                SecondDrawOrder = drawOrder,
                                ActualGap = horseGap,
                                RequiredGap = minimumGap,
                                Message =
                                    "הסוס " +
                                    run.HorseName +
                                    " קיבל רווח של " +
                                    horseGap +
                                    " כניסות במקום " +
                                    minimumGap
                            }
                        );
                    }
                }

                lastRiderPosition[run.RiderFederationMemberId] = index;
                lastHorsePosition[run.HorseId] = index;

                // Expand: every active entry linked to this run gets the same
                // DrawOrder and the same gap/warning values -- they are one
                // arena pass, not separate rider/horse appearances.
                foreach (SecretaryCompetitionEntryItem entry in run.Entries)
                {
                    candidate.Entries.Add(
                        new GroupDrawOrderPreviewEntryItem
                        {
                            EntryId = entry.EntryId,
                            ClassInCompId = entry.ClassInCompId,
                            ClassName = entry.ClassName,
                            ClassDate = entry.ClassDate,
                            OrderInDay = entry.OrderInDay,
                            DrawOrder = drawOrder,
                            HorseId = entry.HorseId,
                            HorseName = entry.HorseName,
                            BarnName = entry.BarnName,
                            RiderFederationMemberId = entry.RiderFederationMemberId,
                            RiderName = entry.RiderName,
                            CoachFederationMemberId = entry.CoachFederationMemberId,
                            CoachName = entry.CoachName,
                            PayerName = entry.PayerName,
                            PrizeRecipientName = entry.PrizeRecipientName,
                            IsPaid = entry.IsPaid,
                            CreatedAt = entry.CreatedAt,
                            RiderGapFromPrevious = riderGap,
                            HorseGapFromPrevious = horseGap,
                            HasRiderGapWarning = hasRiderGapWarning,
                            HasHorseGapWarning = hasHorseGapWarning
                        }
                    );
                }
            }

            candidate.WorstEntityShortage =
                violationsByEntity.Count == 0
                    ? 0
                    : violationsByEntity.Values.Max();

            return candidate;
        }

        private static void AddEntityViolation(
            Dictionary<int, int> violationsByEntity,
            int entityKey,
            int shortage)
        {
            if (!violationsByEntity.ContainsKey(entityKey))
            {
                violationsByEntity[entityKey] = 0;
            }

            violationsByEntity[entityKey] += shortage;
        }

        private static bool IsBetterCandidate(
            DrawCandidate candidate,
            DrawCandidate bestCandidate)
        {
            if (candidate.TotalViolations != bestCandidate.TotalViolations)
            {
                return candidate.TotalViolations < bestCandidate.TotalViolations;
            }

            if (candidate.TotalShortage != bestCandidate.TotalShortage)
            {
                return candidate.TotalShortage < bestCandidate.TotalShortage;
            }

            return candidate.WorstEntityShortage <
                   bestCandidate.WorstEntityShortage;
        }

        private static GroupDrawOrderPreviewResponse BuildResponse(
            DrawCandidate candidate,
            short minimumGap)
        {
            bool hasPerfectSolution = candidate.TotalViolations == 0;

            string summaryMessage = hasPerfectSolution
                ? "נמצאה הגרלה שעומדת ברווח המינימלי לכל הרוכבים והסוסים."
                : "לא נמצאה הגרלה שעומדת ברווח המינימלי לכולם. מוצגת ההגרלה הטובה ביותר שנמצאה.";

            return new GroupDrawOrderPreviewResponse
            {
                MinimumGap = minimumGap,
                EntryCount = candidate.Entries.Count,
                HasPerfectSolution = hasPerfectSolution,
                SummaryMessage = summaryMessage,
                Entries = candidate.Entries,
                Warnings = candidate.Warnings
            };
        }

        private class DrawCandidate
        {
            public List<GroupDrawOrderPreviewEntryItem> Entries { get; set; } =
                new List<GroupDrawOrderPreviewEntryItem>();

            public List<GroupDrawOrderWarningItem> Warnings { get; set; } =
                new List<GroupDrawOrderWarningItem>();

            public int TotalViolations { get; set; }

            public int TotalShortage { get; set; }

            public int WorstEntityShortage { get; set; }
        }
    }
}
