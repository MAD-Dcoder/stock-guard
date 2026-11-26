using StockGuard.Domain.Enums;

namespace StockGuard.Domain.Entities;

public class StockMovement
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public int QuantityDelta { get; private set; }
    public StockMovementType Type { get; private set; }
    public Guid? ReferenceOrderId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private StockMovement() { }

    public StockMovement(Guid productId, int quantityDelta, StockMovementType type, Guid? referenceOrderId = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        QuantityDelta = quantityDelta;
        Type = type;
        ReferenceOrderId = referenceOrderId;
        CreatedAtUtc = DateTime.UtcNow;
    }
}
