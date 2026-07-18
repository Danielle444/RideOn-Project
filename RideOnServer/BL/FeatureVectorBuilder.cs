using RideOnServer.BL.DTOs.Prediction;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    // Assembles the 44-element entry-prediction feature vector for one classincompid, in
    // whatever order modelparameter.featureorder dictates — never a hardcoded C# order. See
    // Smart_Element/01_data_prep.ipynb (Steps 4a/4b/4d) for the feature definitions this mirrors.
    public static class FeatureVectorBuilder
    {
        // Months present in the training data whose one-hot dummy survived drop_first (month_3
        // was the dropped baseline). Months 1, 2 and 7 never occurred in training at all — scoring
        // a class in one of those months is extrapolation with zero training support, not just
        // "baseline", even though the numeric effect (no month_x flag set) is identical.
        private static readonly int[] TrainedMonths = { 4, 5, 6, 8, 9, 10, 11, 12 };

        public static PredictionFeatureVector Build(int classIncompId)
        {
            EntryPredictionDAL dal = new EntryPredictionDAL();
            ActiveModelParameters modelParameters = dal.GetActiveModelParameters();
            return Build(classIncompId, modelParameters);
        }

        // Overload for callers scoring many classes in one pass (e.g. a parity/backfill run)
        // that want to fetch the 44 active model parameters once and reuse them, instead of one
        // usp_GetActiveModelParameters round trip per classincompid — that set doesn't change
        // between rows in a single run.
        public static PredictionFeatureVector Build(int classIncompId, ActiveModelParameters modelParameters)
        {
            if (modelParameters.Parameters.Count == 0)
            {
                throw new Exception("No active model version found");
            }

            EntryPredictionDAL dal = new EntryPredictionDAL();

            EntryPredictionFeatureInputs? inputs = dal.GetFeatureInputs(classIncompId);
            if (inputs == null)
            {
                throw new Exception("ClassInCompId not found");
            }

            if (inputs.FieldAvgPastEntries is null)
            {
                throw new PredictionUnavailableException(
                    $"No completed-competition history for field '{inputs.FieldName}' (classincompid {classIncompId}) — " +
                    "field_avg_past_entries cannot be computed, prediction refused.");
            }

            double fieldAvgPastEntries = (double)inputs.FieldAvgPastEntries.Value;

            // classname_avg_past_entries falls back to field_avg_past_entries when this exact
            // classname has never appeared in a completed competition.
            double classNameAvgPastEntries = inputs.ClassNameAvgPastEntries.HasValue
                ? (double)inputs.ClassNameAvgPastEntries.Value
                : fieldAvgPastEntries;

            Dictionary<string, double> values = BuildFeatureDictionary(inputs, fieldAvgPastEntries, classNameAvgPastEntries);

            List<ModelParameterRow> orderedParameters = modelParameters.Parameters
                .OrderBy(parameter => parameter.FeatureOrder)
                .ToList();

            List<string> featureNames = new List<string>(orderedParameters.Count);
            double[] vector = new double[orderedParameters.Count];

            for (int i = 0; i < orderedParameters.Count; i++)
            {
                ModelParameterRow parameter = orderedParameters[i];

                if (!values.TryGetValue(parameter.FeatureName, out double rawValue))
                {
                    throw new Exception(
                        $"Model parameter '{parameter.FeatureName}' has no matching computed feature — DB/code drift.");
                }

                vector[i] = rawValue;
                featureNames.Add(parameter.FeatureName);
            }

            return new PredictionFeatureVector(
                classIncompId,
                modelParameters.ModelVersionId,
                modelParameters.Intercept,
                modelParameters.Rmse,
                featureNames,
                vector,
                orderedParameters);
        }

        private static Dictionary<string, double> BuildFeatureDictionary(
            EntryPredictionFeatureInputs inputs,
            double fieldAvgPastEntries,
            double classNameAvgPastEntries)
        {
            // Both computed on the raw UTC instant classdatetime carries (schema:
            // "timestamp with time zone") — the notebook never converts to Israel local time
            // (_flatten's pd.to_datetime resolves to datetime64[us, UTC] straight from the
            // PostgREST ISO string), so neither may this. day_of_week is remapped from .NET's
            // Sunday=0 convention to pandas' dt.dayofweek Monday=0 convention.
            DateTime classDateTimeUtc = DateTime.SpecifyKind(inputs.ClassDateTime, DateTimeKind.Utc);
            int month = classDateTimeUtc.Month;
            int dayOfWeek = ((int)classDateTimeUtc.DayOfWeek + 6) % 7;

            ClassNameFeatures nameFeatures = ClassNameFeatureExtractor.Extract(inputs.ClassName);

            // has_prize_* is amount > 0, matching training semantics exactly — a zero-amount
            // prize row (never occurs live given the CHECK constraint, but keep it faithful to
            // the notebook's own reconstruction) must NOT flip the flag to true.
            bool hasPrizeShovar = inputs.PrizeShovarAmount > 0;
            bool hasPrizeJackpot = inputs.PrizeJackpotPostedAmount > 0;
            bool hasPrizeAddedMoney = inputs.PrizeAddedMoneyAmount > 0;

            Dictionary<string, double> values = new Dictionary<string, double>
            {
                ["orderinday"] = inputs.OrderInDay ?? 0,
                ["totalcost"] = (double)inputs.TotalCost,
                ["day_of_week"] = dayOfWeek,
                ["classes_per_competition"] = inputs.ClassesPerCompetition,
                ["field_avg_past_entries"] = fieldAvgPastEntries,
                ["classname_avg_past_entries"] = classNameAvgPastEntries,
                ["horse_futurity"] = ToDouble(nameFeatures.HorseFuturity),
                ["horse_novice"] = ToDouble(nameFeatures.HorseNovice),
                ["horse_derby"] = ToDouble(nameFeatures.HorseDerby),
                ["rider_youth"] = ToDouble(nameFeatures.RiderYouth),
                ["rider_adult_plus"] = ToDouble(nameFeatures.RiderAdultPlus),
                ["fed_NRHA"] = ToDouble(nameFeatures.FedNRHA),
                ["fed_NCHA"] = ToDouble(nameFeatures.FedNCHA),
                ["fed_EXCA"] = ToDouble(nameFeatures.FedEXCA),
                ["rider_open"] = ToDouble(nameFeatures.RiderOpen),
                ["rider_non_pro"] = ToDouble(nameFeatures.RiderNonPro),
                ["rider_yaroki"] = ToDouble(nameFeatures.RiderYaroki),
                ["rider_pro"] = ToDouble(nameFeatures.RiderPro),
                ["rider_limited"] = ToDouble(nameFeatures.RiderLimited),
                ["subtype_cow_horse"] = ToDouble(nameFeatures.SubtypeCowHorse),
                ["subtype_premium"] = ToDouble(nameFeatures.SubtypePremium),
                ["subtype_platinum"] = ToDouble(nameFeatures.SubtypePlatinum),
                ["subtype_trail"] = ToDouble(nameFeatures.SubtypeTrail),
                ["subtype_horsemanship"] = ToDouble(nameFeatures.SubtypeHorsemanship),
                ["subtype_pleasure"] = ToDouble(nameFeatures.SubtypePleasure),
                ["subtype_hunt_seat"] = ToDouble(nameFeatures.SubtypeHuntSeat),
                ["subtype_hunter_under_saddle"] = ToDouble(nameFeatures.SubtypeHunterUnderSaddle),
                ["subtype_walk_jog"] = ToDouble(nameFeatures.SubtypeWalkJog),
                ["subtype_range_sorting"] = ToDouble(nameFeatures.SubtypeRangeSorting),
                ["subtype_intermediate"] = ToDouble(nameFeatures.SubtypeIntermediate),
                ["subtype_young_gun"] = ToDouble(nameFeatures.SubtypeYoungGun),
                ["is_practice"] = ToDouble(nameFeatures.IsPractice),
                ["has_prize_shovar"] = ToDouble(hasPrizeShovar),
                ["has_prize_jackpot"] = ToDouble(hasPrizeJackpot),
                ["has_prize_added_money"] = ToDouble(hasPrizeAddedMoney),
                ["prize_jackpot_posted_amount"] = (double)inputs.PrizeJackpotPostedAmount
            };

            foreach (int trainedMonth in TrainedMonths)
            {
                values[$"month_{trainedMonth}"] = month == trainedMonth ? 1 : 0;
            }

            return values;
        }

        private static double ToDouble(bool value) => value ? 1 : 0;
    }
}
