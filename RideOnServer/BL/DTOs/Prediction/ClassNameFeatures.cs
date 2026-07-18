namespace RideOnServer.BL.DTOs.Prediction
{
    // Output of ClassNameFeatureExtractor — one flag per classname text pattern from
    // Smart_Element/01_data_prep.ipynb cell nb01-4b. horse_none / rider_all_ages / fed_IEF /
    // no_prize are the multicollinearity baselines dropped from the trained model (step 4e) and
    // are intentionally not represented here — FeatureVectorBuilder never needs them because it
    // looks features up by name against modelparameter, which doesn't contain those names.
    public sealed record ClassNameFeatures(
        bool HorseFuturity,
        bool HorseNovice,
        bool HorseDerby,
        bool RiderYouth,
        bool RiderAdultPlus,
        bool FedNRHA,
        bool FedNCHA,
        bool FedEXCA,
        bool RiderOpen,
        bool RiderNonPro,
        bool RiderYaroki,
        bool RiderPro,
        bool RiderLimited,
        bool SubtypeCowHorse,
        bool SubtypePremium,
        bool SubtypePlatinum,
        bool SubtypeTrail,
        bool SubtypeHorsemanship,
        bool SubtypePleasure,
        bool SubtypeHuntSeat,
        bool SubtypeHunterUnderSaddle,
        bool SubtypeWalkJog,
        bool SubtypeRangeSorting,
        bool SubtypeIntermediate,
        bool SubtypeYoungGun,
        bool IsPractice);
}
