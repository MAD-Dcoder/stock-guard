using StockGuard.Domain.Enums;
using StockGuard.Domain.Exceptions;

namespace StockGuard.Domain.Entities;

public class Order
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public Product? Product { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal TotalPrice { get; private set; }
    public string CustomerEmail { get; private set; } = string.Empty;
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private Order() { }

    public Order(Guid productId, int quantity, decimal unitPrice, string customerEmail)
    {
        if (productId == Guid.Empty)
            throw new DomainException("Produto inválido.");
        if (quantity <= 0)
            throw new DomainException("A quantidade do pedido deve ser maior que zero.");
        if (unitPrice <= 0)
            throw new DomainException("O preço unitário deve ser maior que zero.");
        if (string.IsNullOrWhiteSpace(customerEmail))
            throw new DomainException("O e-mail do cliente é obrigatório.");

        Id = Guid.NewGuid();
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
        TotalPrice = unitPrice * quantity;
        CustomerEmail = customerEmail.Trim().ToLowerInvariant();
        Status = OrderStatus.Confirmed;
        CreatedAtUtc = DateTime.UtcNow;
    }
}
