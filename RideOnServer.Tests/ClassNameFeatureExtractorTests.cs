using FluentAssertions;
using RideOnServer.BL;

namespace RideOnServer.Tests
{
    public class ClassNameFeatureExtractorTests
    {
        // --- Ground-truth composite classnames -----------------------------------------------
        // Real classname strings for classincompid 619/620/621, printed verbatim by
        // Smart_Element/01_data_prep.ipynb's df.head(6) output (cell nb01-s2-code). Expected
        // flags are cross-checked against the same three rows in models/parity_reference_v1.csv
        // (which stores the trained model's frozen feature values but not the classname text
        // itself) — so these three cases are doubly verified: real text from the notebook,
        // real expected flags from the parity CSV, for the same classincompid.

        [Fact]
        public void Extract_NonProNRHA_SetsFedNRHAAndRiderNonProOnly()
        {
            // classincompid 619 — parity CSV row: fed_NRHA=1, rider_non_pro=1, all other dim flags 0
            var result = ClassNameFeatureExtractor.Extract("Non Pro NRHA");

            result.FedNRHA.Should().BeTrue();
            result.RiderNonPro.Should().BeTrue();
            result.RiderOpen.Should().BeFalse();
            result.RiderLimited.Should().BeFalse();
            result.RiderPro.Should().BeFalse();
            result.HorseFuturity.Should().BeFalse();
            result.HorseNovice.Should().BeFalse();
            result.HorseDerby.Should().BeFalse();
            result.RiderYouth.Should().BeFalse();
            result.RiderAdultPlus.Should().BeFalse();
            result.IsPractice.Should().BeFalse();
        }

        [Fact]
        public void Extract_LimitedNonProNRHA_SetsFedNRHARiderNonProAndRiderLimited()
        {
            // classincompid 620 — parity CSV row: fed_NRHA=1, rider_non_pro=1, rider_limited=1
            var result = ClassNameFeatureExtractor.Extract("Limited Non Pro NRHA");

            result.FedNRHA.Should().BeTrue();
            result.RiderNonPro.Should().BeTrue();
            result.RiderLimited.Should().BeTrue();
            result.RiderOpen.Should().BeFalse();
            result.RiderPro.Should().BeFalse();
        }

        [Fact]
        public void Extract_LimitedOpenNRHA_SetsFedNRHARiderOpenAndRiderLimited()
        {
            // classincompid 621 — parity CSV row: fed_NRHA=1, rider_open=1, rider_limited=1
            var result = ClassNameFeatureExtractor.Extract("Limited Open NRHA");

            result.FedNRHA.Should().BeTrue();
            result.RiderOpen.Should().BeTrue();
            result.RiderLimited.Should().BeTrue();
            result.RiderNonPro.Should().BeFalse();
        }

        // --- Dimension 1 — Horse Level --------------------------------------------------------

        [Fact]
        public void Extract_Futurity_SetsHorseFuturityOnly()
        {
            var result = ClassNameFeatureExtractor.Extract("פתוח פטוריטי");
            result.HorseFuturity.Should().BeTrue();
            result.HorseNovice.Should().BeFalse();
            result.HorseDerby.Should().BeFalse();
        }

        [Fact]
        public void Extract_Novice_SetsHorseNovice()
        {
            var result = ClassNameFeatureExtractor.Extract("נוביס פתוח");
            result.HorseNovice.Should().BeTrue();
        }

        [Fact]
        public void Extract_NoviceWithDerby_ExcludesHorseNovice()
        {
            // horse_novice explicitly excludes rows that also match futurity/derby —
            // nb01-4b: `& ~_cn.str.contains("פטוריטי|futurity|דרבי|derby", ...)`.
            var result = ClassNameFeatureExtractor.Extract("נוביס דרבי");
            result.HorseNovice.Should().BeFalse();
            result.HorseDerby.Should().BeTrue();
        }

        // --- Dimension 2 — Rider Age -----------------------------------------------------------

        [Fact]
        public void Extract_Youth_SetsRiderYouth()
        {
            var result = ClassNameFeatureExtractor.Extract("נוער עד 18");
            result.RiderYouth.Should().BeTrue();
            result.RiderAdultPlus.Should().BeFalse();
        }

        [Fact]
        public void Extract_AdultPlus_SetsRiderAdultPlus()
        {
            var result = ClassNameFeatureExtractor.Extract("בוגרים 40+");
            result.RiderAdultPlus.Should().BeTrue();
            result.RiderYouth.Should().BeFalse();
        }

        [Fact]
        public void Extract_BogrimWithinYouthMarker_ExcludedFromAdultPlus()
        {
            // nb01-4b: rider_adult_plus explicitly ANDs `~rider_youth` — "בוגרים" co-occurring
            // with a youth marker must NOT flip adult_plus on.
            var result = ClassNameFeatureExtractor.Extract("בוגרים עד 18");
            result.RiderYouth.Should().BeTrue();
            result.RiderAdultPlus.Should().BeFalse();
        }

        // --- Dimension 3 — Federation -----------------------------------------------------------

        [Fact]
        public void Extract_NCHA_SetsFedNCHA()
        {
            var result = ClassNameFeatureExtractor.Extract("Open NCHA");
            result.FedNCHA.Should().BeTrue();
            result.FedNRHA.Should().BeFalse();
            result.FedEXCA.Should().BeFalse();
        }

        [Fact]
        public void Extract_EXCA_SetsFedEXCA()
        {
            var result = ClassNameFeatureExtractor.Extract("EXCA Open");
            result.FedEXCA.Should().BeTrue();
        }

        // --- Dimension 4 — Rider Level -----------------------------------------------------------

        [Fact]
        public void Extract_ProStandalone_SetsRiderPro()
        {
            var result = ClassNameFeatureExtractor.Extract("Open Pro NRHA");
            result.RiderPro.Should().BeTrue();
            result.RiderNonPro.Should().BeFalse();
        }

        [Fact]
        public void Extract_NonProContainsPro_DoesNotSetRiderPro()
        {
            // \bpro\b alone would match inside "non pro" too — the exclusion
            // `& ~rider_non_pro` is what stops it.
            var result = ClassNameFeatureExtractor.Extract("Non Pro NRHA");
            result.RiderPro.Should().BeFalse();
            result.RiderNonPro.Should().BeTrue();
        }

        [Fact]
        public void Extract_Yaroki_SetsRiderYaroki()
        {
            var result = ClassNameFeatureExtractor.Extract("רוכב ירוקי פתוח");
            result.RiderYaroki.Should().BeTrue();
        }

        [Fact]
        public void Extract_LoLimited_UnrestrictedText_SetsRiderOpenNotRiderLimited()
        {
            // Discovered discrepancy: ride-on-system-knowledge SKILL.md's Dimension-4 table says
            // rider_open should EXCLUDE "לא מוגבל", but the notebook's actual code (nb01-4b)
            // includes "לא מוגבל" as a POSITIVE trigger for rider_open and only rider_limited
            // excludes it. The notebook is ground truth for the trained model, so this extractor
            // must match the notebook, not the skill doc.
            var result = ClassNameFeatureExtractor.Extract("לא מוגבל");
            result.RiderOpen.Should().BeTrue();
            result.RiderLimited.Should().BeFalse();
        }

        [Fact]
        public void Extract_LimitedNoUnrestrictedMarker_SetsRiderLimited()
        {
            var result = ClassNameFeatureExtractor.Extract("מוגבל פתוח");
            result.RiderLimited.Should().BeTrue();
        }

        // --- Dimension 5 — Sub-type within field -------------------------------------------------

        [Fact]
        public void Extract_TrailWithAdultPlus_SetsBothSimultaneously()
        {
            // Sub-type flags are multi-label and field-scoped, independent of the other
            // dimensions — a class can be both a trail sub-type and adult_plus at once.
            var result = ClassNameFeatureExtractor.Extract("טרייל בוגרים 40+");
            result.SubtypeTrail.Should().BeTrue();
            result.RiderAdultPlus.Should().BeTrue();
        }

        [Fact]
        public void Extract_WalkJogTypoVariant_StillMatches()
        {
            // "הליכה גוג" (missing the geresh in ג'וג) is an explicit typo variant kept in the
            // notebook's own pattern, not part of the historical-insert normalization table.
            var result = ClassNameFeatureExtractor.Extract("הליכה גוג");
            result.SubtypeWalkJog.Should().BeTrue();
        }

        [Fact]
        public void Extract_PleasureApostropheVariant_StillMatches()
        {
            var result = ClassNameFeatureExtractor.Extract("פלזר בוגרים");
            result.SubtypePleasure.Should().BeTrue();
        }

        // --- Practice flag -----------------------------------------------------------------------

        [Fact]
        public void Extract_Imun_SetsIsPractice()
        {
            var result = ClassNameFeatureExtractor.Extract("אימון פתוח");
            result.IsPractice.Should().BeTrue();
        }

        [Fact]
        public void Extract_NoImun_DoesNotSetIsPractice()
        {
            var result = ClassNameFeatureExtractor.Extract("פתוח NRHA");
            result.IsPractice.Should().BeFalse();
        }

        // --- Defensive null/case handling ---------------------------------------------------------

        [Fact]
        public void Extract_NullClassname_ReturnsAllFalseInsteadOfThrowing()
        {
            var result = ClassNameFeatureExtractor.Extract(null);
            result.HorseFuturity.Should().BeFalse();
            result.FedNRHA.Should().BeFalse();
            result.IsPractice.Should().BeFalse();
        }

        [Fact]
        public void Extract_IsCaseInsensitiveForEnglishTokens()
        {
            var lower = ClassNameFeatureExtractor.Extract("non pro nrha");
            var upper = ClassNameFeatureExtractor.Extract("NON PRO NRHA");

            upper.Should().Be(lower);
        }
    }
}
