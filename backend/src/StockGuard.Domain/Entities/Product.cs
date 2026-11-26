using StockGuard.Domain.Exceptions;

namespace StockGuard.Domain.Entities;

public class Product
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int StockQuantity { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    private Product() { }

    public Product(string name, string sku, decimal price, int initialStock)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("O nome do produto é obrigatório.");
        if (string.IsNullOrWhiteSpace(sku))
            throw new DomainException("O SKU do produto é obrigatório.");
        if (price <= 0)
            throw new DomainException("O preço deve ser maior que zero.");
        if (initialStock < 0)
            throw new DomainException("O estoque inicial não pode ser negativo.");

        var now = DateTime.UtcNow;
        Id = Guid.NewGuid();
        Name = name.Trim();
        Sku = sku.Trim().ToUpperInvariant();
        Price = price;
        StockQuantity = initialStock;
        CreatedAtUtc = now;
        UpdatedAtUtc = now;
    }

    public void Restock(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("A quantidade de reposição deve ser maior que zero.");

        StockQuantity += quantity;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
