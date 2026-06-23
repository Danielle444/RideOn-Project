namespace RideOnServer.BL.DTOs.Competition
{
    public class DuplicateCompetitionSelectionClassItem
    {
        public int SourceClassInCompId { get; set; }

        public bool CopyClass { get; set; } = true;
        public bool CopyClassPrices { get; set; } = true;
        public bool CopyClassPrizes { get; set; } = true;
        public bool CopyReiningPattern { get; set; } = false;
    }
}