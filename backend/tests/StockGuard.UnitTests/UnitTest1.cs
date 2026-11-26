using StockGuard.Domain.Entities;
using StockGuard.Domain.Exceptions;

namespace StockGuard.UnitTests;

public class ProductTests
{
    [Fact]
    public void CreateProduct_WithValidData_ShouldNormalizeSkuAndSetInitialStock()
    {
        var product = new Product("iPhone 16 Pro", "  iph-16p  ", 8999.00m, 5);

        Assert.Equal("iPhone 16 Pro", product.Name);
        Assert.Equal("IPH-16P", product.Sku);
        Assert.Equal(8999.00m, product.Price);
        Assert.Equal(5, product.StockQuantity);
    }

    [Fact]
    public void CreateProduct_WithNegativeStock_ShouldThrowDomainException()
    {
        Assert.Throws<DomainException>(() => new Product("Item", "SKU-1", 10m, -1));
    }

    [Fact]
    public void Restock_WithValidQuantity_ShouldIncreaseStock()
    {
        var product = new Product("Teclado", "KEY-1", 300m, 2);
        product.Restock(8);

        Assert.Equal(10, product.StockQuantity);
    }

    [Fact]
    public void Order_ShouldCalculateTotalPriceCorrectly()
    {
        var order = new Order(Guid.NewGuid(), 3, 150.50m, "Cliente@Exemplo.com");

        Assert.Equal(451.50m, order.TotalPrice);
        Assert.Equal("cliente@exemplo.com", order.CustomerEmail);
    }
}
