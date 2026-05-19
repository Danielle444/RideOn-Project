using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.BL.Services
{
    public static class DrawOrderGenerator
    {
        private const int MaxAttempts = 2500;

        public static GroupDrawOrderPreviewResponse GeneratePreview(
            List<SecretaryCompetitionEntryItem> entries,
            short minimumGap)
        {
            if (entries == null || entries.Count == 0)
            {
                throw new Exception("No entries found for draw group");
            }

            if (minimumGap <= 0)
            {
                minimumGap = 7;
            }

            List<SecretaryCompetitionEntryItem> orderedBase =
                entries
                    .OrderBy(item => item.CreatedAt)
                    .ThenBy(item => item.EntryId)
                    .ToList();

            DrawCandidate bestCandidate =
                BuildCandidate(orderedBase, minimumGap);

            Random random = new Random();

            for (int attempt = 0; attempt < MaxAttempts; attempt++)
            {
                List<SecretaryCompetitionEntryItem> shuffled =
                    ShuffleEntries(orderedBase, random);

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

        private static List<SecretaryCompetitionEntryItem> ShuffleEntries(
            List<SecretaryCompetitionEntryItem> entries,
            Random random)
        {
            List<SecretaryCompetitionEntryItem> shuffled =
                entries.ToList();

            for (int i = shuffled.Count - 1; i > 0; i--)
            {
                int randomIndex = random.Next(i + 1);

                SecretaryCompetitionEntryItem temp = shuffled[i];
                shuffled[i] = shuffled[randomIndex];
                shuffled[randomIndex] = temp;
            }

            return shuffled;
        }

        private static DrawCandidate BuildCandidate(
            List<SecretaryCompetitionEntryItem> orderedEntries,
            short minimumGap)
        {
            DrawCandidate candidate = new DrawCandidate();

            Dictionary<int, int> lastRiderPosition =
                new Dictionary<int, int>();

            Dictionary<int, int> lastHorsePosition =
                new Dictionary<int, int>();

            Dictionary<int, int> violationsByEntity =
                new Dictionary<int, int>();

            for (int index = 0; index < orderedEntries.Count; index++)
            {
                SecretaryCompetitionEntryItem entry = orderedEntries[index];

                short drawOrder = Convert.ToInt16(index + 1);

                GroupDrawOrderPreviewEntryItem previewItem =
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
                        RiderGapFromPrevious = 0,
                        HorseGapFromPrevious = 0,
                        HasRiderGapWarning = false,
                        HasHorseGapWarning = false
                    };

                if (lastRiderPosition.ContainsKey(entry.RiderFederationMemberId))
                {
                    int previousPosition =
                        lastRiderPosition[entry.RiderFederationMemberId];

                    int actualGap = index - previousPosition;

                    previewItem.RiderGapFromPrevious = actualGap;

                    if (actualGap < minimumGap)
                    {
                        previewItem.HasRiderGapWarning = true;

                        int shortage = minimumGap - actualGap;

                        candidate.TotalViolations += 1;
                        candidate.TotalShortage += shortage;

                        AddEntityViolation(
                            violationsByEntity,
                            entry.RiderFederationMemberId,
                            shortage
                        );

                        candidate.Warnings.Add(
                            new GroupDrawOrderWarningItem
                            {
                                WarningType = "Rider",
                                EntityId = entry.RiderFederationMemberId,
                                EntityName = entry.RiderName,
                                FirstDrawOrder =
                                    Convert.ToInt16(previousPosition + 1),
                                SecondDrawOrder = drawOrder,
                                ActualGap = actualGap,
                                RequiredGap = minimumGap,
                                Message =
                                    "הרוכב/ת " +
                                    entry.RiderName +
                                    " קיבל/ה רווח של " +
                                    actualGap +
                                    " כניסות במקום " +
                                    minimumGap
                            }
                        );
                    }
                }

                if (lastHorsePosition.ContainsKey(entry.HorseId))
                {
                    int previousPosition =
                        lastHorsePosition[entry.HorseId];

                    int actualGap = index - previousPosition;

                    previewItem.HorseGapFromPrevious = actualGap;

                    if (actualGap < minimumGap)
                    {
                        previewItem.HasHorseGapWarning = true;

                        int shortage = minimumGap - actualGap;

                        candidate.TotalViolations += 1;
                        candidate.TotalShortage += shortage;

                        AddEntityViolation(
                            violationsByEntity,
                            entry.HorseId * -1,
                            shortage
                        );

                        candidate.Warnings.Add(
                            new GroupDrawOrderWarningItem
                            {
                                WarningType = "Horse",
                                EntityId = entry.HorseId,
                                EntityName = entry.HorseName,
                                FirstDrawOrder =
                                    Convert.ToInt16(previousPosition + 1),
                                SecondDrawOrder = drawOrder,
                                ActualGap = actualGap,
                                RequiredGap = minimumGap,
                                Message =
                                    "הסוס " +
                                    entry.HorseName +
                                    " קיבל רווח של " +
                                    actualGap +
                                    " כניסות במקום " +
                                    minimumGap
                            }
                        );
                    }
                }

                lastRiderPosition[entry.RiderFederationMemberId] = index;
                lastHorsePosition[entry.HorseId] = index;

                candidate.Entries.Add(previewItem);
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