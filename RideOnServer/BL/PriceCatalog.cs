namespace RideOnServer.BL
{
    public class PriceCatalog
    {
        public int CatalogItemId { get; set; }

        public DateTime? CreationDate { get; set; }

        public short? ItemPrice { get; set; }

        public int RanchId { get; set; }

        public short? CatalogId { get; set; }
    }
}