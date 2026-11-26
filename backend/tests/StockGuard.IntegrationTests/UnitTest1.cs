using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using StockGuard.Application.DTOs;
using StockGuard.Infrastructure.Persistence;

namespace StockGuard.IntegrationTests;

public class ConcurrencyTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ConcurrencyTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockGuardDbContext>();
        db.Database.EnsureCreated();
    }

    [Fact]
    public async Task ConcurrentOrders_WhenOnlyOneUnitInStock_ShouldApproveExactlyOneAndRejectOthers()
    {
        var client = _factory.CreateClient();
        var sku = $"CONC-{Guid.NewGuid():N}"[..16];

        var createResponse = await client.PostAsJsonAsync("/api/products", new CreateProductRequest(
            Name: "iPhone 16 Pro (Última Unidade)",
            Sku: sku,
            Price: 8999.00m,
            InitialStock: 1));

        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        const int concurrentBuyers = 10;
        var tasks = Enumerable.Range(0, concurrentBuyers)
            .Select(i => client.PostAsJsonAsync("/api/orders", new CreateOrderRequest(
                ProductId: product.Id,
                Quantity: 1,
                CustomerEmail: $"buyer{i}@stockguard.dev")))
            .ToArray();

        var responses = await Task.WhenAll(tasks);

        var createdCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.Equal(1, createdCount);
        Assert.Equal(concurrentBuyers - 1, conflictCount);

        var finalProduct = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{product.Id}");
        Assert.NotNull(finalProduct);
        Assert.Equal(0, finalProduct.StockQuantity);
    }

    [Fact]
    public async Task PlaceOrder_WithAvailableStock_ShouldDecrementStockAndReturnOrder()
    {
        var client = _factory.CreateClient();
        var sku = $"ORD-{Guid.NewGuid():N}"[..15];

        var createResponse = await client.PostAsJsonAsync("/api/products", new CreateProductRequest(
            Name: "Monitor Dell 4K",
            Sku: sku,
            Price: 3200.00m,
            InitialStock: 5));

        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        var orderResponse = await client.PostAsJsonAsync("/api/orders", new CreateOrderRequest(
            ProductId: product.Id,
            Quantity: 2,
            CustomerEmail: "matheus@stockguard.dev"));

        Assert.Equal(HttpStatusCode.Created, orderResponse.StatusCode);
        var order = await orderResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.Equal(6400.00m, order.TotalPrice);

        var updatedProduct = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{product.Id}");
        Assert.NotNull(updatedProduct);
        Assert.Equal(3, updatedProduct.StockQuantity);
    }
}
