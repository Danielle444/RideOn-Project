namespace RideOnServer.BL.DTOs.Financial
{
    // Read-side config for the Smart Element Phase 8 financial projection. Every field is a raw
    // input to the client-side derivation (financialProjection.utils.js) -- NOT a derived result;
    // the entry / stall / shavings income bands, the bag-order quantity and the tack uplift are
    // all computed at read time on the client, nothing stored.
    //
    // Prices and supplies are NULLABLE on purpose: a missing active price row comes back null and
    // the frontend renders a "set your prices" prompt for it, never a zero (absence != zero). A
    // present-but-zero price is a real 0, not a null. Ranch 49 (Green Fields) exercises the null
    // path -- zero pricecatalog rows and zero stalls.
    public sealed class FinancialConfig
    {
        public int? RanchId { get; init; }
        public int? CompetitionDays { get; init; }
        public int? FieldId { get; init; }
        public int? MaxHorseClassesPerDay { get; init; }
        public decimal? StallRegularPrice { get; init; }
        public decimal? StallUpgradedPrice { get; init; }
        public int? StallRegularSupply { get; init; }
        public int? StallUpgradedSupply { get; init; }
        public decimal? ShavingsPriceMin { get; init; }
        public decimal? ShavingsPriceMax { get; init; }
        public int? ShavingsActiveCount { get; init; }
        public decimal? ShavingsBagsMin { get; init; }
        public decimal? ShavingsBagsMax { get; init; }
        public decimal? TackHorsesPerUnitMin { get; init; }
        public decimal? TackHorsesPerUnitMax { get; init; }
    }
}
