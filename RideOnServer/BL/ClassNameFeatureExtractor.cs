using System.Text.RegularExpressions;
using RideOnServer.BL.DTOs.Prediction;

namespace RideOnServer.BL
{
    // Pure C# port of Smart_Element/01_data_prep.ipynb cell nb01-4b (Step 4b — Class dimensions).
    // No DB access. Patterns are copied verbatim from the notebook, not from the
    // ride-on-system-knowledge or ride-on-entry-prediction skill docs — both were found to
    // disagree with the notebook on at least one rule (rider_open/rider_limited handling of
    // "לא מוגבל", see RiderOpen/RiderLimited below), and the notebook is the trained model's
    // ground truth.
    //
    // No prefix-stripping or typo normalization is applied. Those rules (ride-on-system-knowledge
    // SKILL.md "Class Name Normalization Rules") belong to the historical-insert pipeline that
    // matches a raw Excel string to a classtype row before it's ever saved — by the time a
    // classname reaches this extractor it's already the canonical classtype.classname text the
    // notebook trained on, and applying insert-time normalization here would diverge from training.
    public static class ClassNameFeatureExtractor
    {
        private static readonly Regex HorseFuturityPattern = Build("פטוריטי|futurity");
        private static readonly Regex HorseNoviceIncludePattern = Build("נוביס|novice|green horse");
        private static readonly Regex HorseNoviceExcludePattern = Build("פטוריטי|futurity|דרבי|derby");
        private static readonly Regex HorseDerbyPattern = Build("דרבי|derby");

        private static readonly Regex RiderYouthPattern = Build(@"נוער|עד\s*\d+|עד\s*גיל|\b1[0-9]\b|youth|young");
        private static readonly Regex RiderAdultPlusPattern = Build(@"40\+|50\+|בוגרים|prime time");

        private static readonly Regex FedNRHAPattern = Build("nrha");
        private static readonly Regex FedNCHAPattern = Build("ncha");
        private static readonly Regex FedEXCAPattern = Build("exca");

        // rider_open includes "לא מוגבל"/"unrestricted" as a positive trigger (== unrestricted ==
        // open) — it does NOT exclude them. Only rider_limited excludes them. This is the exact
        // opposite of what ride-on-system-knowledge SKILL.md's Dimension-4 table states ("open —
        // exclude לא מוגבל"); verified against the notebook's literal code, which is ground truth.
        private static readonly Regex RiderOpenPattern = Build(@"פתוח|לא מוגבל|unrestricted|\bopen\b");
        private static readonly Regex RiderNonProPattern = Build("נונ פרו|נונפרו|non pro|nonpro");
        private static readonly Regex RiderYarokiPattern = Build(@"ירוקי|ירוקי רוכב|רוכב ירוקי|רוכב חדש");
        private static readonly Regex RiderProPattern = Build(@"\bpro\b");
        private static readonly Regex RiderLimitedIncludePattern = Build("מוגבל|limited|limit rider");
        private static readonly Regex RiderLimitedExcludePattern = Build("לא מוגבל|unrestricted");

        private static readonly Regex SubtypeCowHorsePattern = Build("קאו הורס");
        private static readonly Regex SubtypePremiumPattern = Build("פרימיום");
        private static readonly Regex SubtypePlatinumPattern = Build("פלאטינום");
        private static readonly Regex SubtypeTrailPattern = Build("טרייל");
        private static readonly Regex SubtypeHorsemanshipPattern = Build("הורסמנשיפ");
        private static readonly Regex SubtypePleasurePattern = Build("פלז'ר|פלזר");
        private static readonly Regex SubtypeHuntSeatPattern = Build("האנט סיט אקוויטיישן");
        private static readonly Regex SubtypeHunterUnderSaddlePattern = Build("האנטר אנדר סאדל");
        private static readonly Regex SubtypeWalkJogPattern = Build("הליכה ג'וג|הליכה גוג");
        private static readonly Regex SubtypeRangeSortingPattern = Build("ראנג' סורטינג");
        private static readonly Regex SubtypeIntermediatePattern = Build("intermediate");
        private static readonly Regex SubtypeYoungGunPattern = Build("young gun");

        private static readonly Regex IsPracticePattern = Build("אימון");

        public static ClassNameFeatures Extract(string? classname)
        {
            // Mirrors the notebook's `_cn = df_feat["classname"].fillna("").str.lower()` guard —
            // classtype.classname is NOT NULL in schema, so this is defensive only.
            string name = (classname ?? string.Empty).ToLowerInvariant();

            bool horseFuturity = HorseFuturityPattern.IsMatch(name);
            bool horseDerby = HorseDerbyPattern.IsMatch(name);
            bool horseNovice = HorseNoviceIncludePattern.IsMatch(name) && !HorseNoviceExcludePattern.IsMatch(name);

            bool riderYouth = RiderYouthPattern.IsMatch(name);
            bool riderAdultPlus = RiderAdultPlusPattern.IsMatch(name) && !riderYouth;

            bool fedNRHA = FedNRHAPattern.IsMatch(name);
            bool fedNCHA = FedNCHAPattern.IsMatch(name);
            bool fedEXCA = FedEXCAPattern.IsMatch(name);

            bool riderNonPro = RiderNonProPattern.IsMatch(name);
            bool riderOpen = RiderOpenPattern.IsMatch(name);
            bool riderYaroki = RiderYarokiPattern.IsMatch(name);
            bool riderPro = RiderProPattern.IsMatch(name) && !riderNonPro;
            bool riderLimited = RiderLimitedIncludePattern.IsMatch(name) && !RiderLimitedExcludePattern.IsMatch(name);

            return new ClassNameFeatures(
                HorseFuturity: horseFuturity,
                HorseNovice: horseNovice,
                HorseDerby: horseDerby,
                RiderYouth: riderYouth,
                RiderAdultPlus: riderAdultPlus,
                FedNRHA: fedNRHA,
                FedNCHA: fedNCHA,
                FedEXCA: fedEXCA,
                RiderOpen: riderOpen,
                RiderNonPro: riderNonPro,
                RiderYaroki: riderYaroki,
                RiderPro: riderPro,
                RiderLimited: riderLimited,
                SubtypeCowHorse: SubtypeCowHorsePattern.IsMatch(name),
                SubtypePremium: SubtypePremiumPattern.IsMatch(name),
                SubtypePlatinum: SubtypePlatinumPattern.IsMatch(name),
                SubtypeTrail: SubtypeTrailPattern.IsMatch(name),
                SubtypeHorsemanship: SubtypeHorsemanshipPattern.IsMatch(name),
                SubtypePleasure: SubtypePleasurePattern.IsMatch(name),
                SubtypeHuntSeat: SubtypeHuntSeatPattern.IsMatch(name),
                SubtypeHunterUnderSaddle: SubtypeHunterUnderSaddlePattern.IsMatch(name),
                SubtypeWalkJog: SubtypeWalkJogPattern.IsMatch(name),
                SubtypeRangeSorting: SubtypeRangeSortingPattern.IsMatch(name),
                SubtypeIntermediate: SubtypeIntermediatePattern.IsMatch(name),
                SubtypeYoungGun: SubtypeYoungGunPattern.IsMatch(name),
                IsPractice: IsPracticePattern.IsMatch(name));
        }

        private static Regex Build(string pattern) =>
            new Regex(pattern, RegexOptions.Compiled | RegexOptions.CultureInvariant);
    }
}
