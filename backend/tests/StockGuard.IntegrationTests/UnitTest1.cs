using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
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
            Name: "iPhone 16 Pro",
            Sku: sku,
            Price: 8999.00m,
            InitialStock: 1));

        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        try
        {
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
        finally
        {
            await CleanupProductAsync(product.Id);
        }
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

        try
        {
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
        finally
        {
            await CleanupProductAsync(product.Id);
        }
    }

    [Fact]
    public async Task PlaceOrder_WithSameIdempotencyKey_ShouldCreateOnlyOneOrder()
    {
        var client = _factory.CreateClient();
        var sku = $"IDEM-{Guid.NewGuid():N}"[..16];

        var createResponse = await client.PostAsJsonAsync("/api/products", new CreateProductRequest(
            Name: "SSD NVMe 1TB",
            Sku: sku,
            Price: 499.00m,
            InitialStock: 5));

        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        try
        {
            var idempotencyKey = $"key-{Guid.NewGuid():N}";
            var payload = new CreateOrderRequest(product.Id, 2, "idem@stockguard.dev");

            using var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/orders")
            {
                Content = JsonContent.Create(payload)
            };
            req1.Headers.Add("Idempotency-Key", idempotencyKey);

            using var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/orders")
            {
                Content = JsonContent.Create(payload)
            };
            req2.Headers.Add("Idempotency-Key", idempotencyKey);

            var res1 = await client.SendAsync(req1);
            var res2 = await client.SendAsync(req2);

            Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
            Assert.Equal(HttpStatusCode.Created, res2.StatusCode);

            var order1 = await res1.Content.ReadFromJsonAsync<OrderResponse>();
            var order2 = await res2.Content.ReadFromJsonAsync<OrderResponse>();
            Assert.NotNull(order1);
            Assert.NotNull(order2);
            Assert.Equal(order1.Id, order2.Id);

            var updatedProduct = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{product.Id}");
            Assert.NotNull(updatedProduct);
            Assert.Equal(3, updatedProduct.StockQuantity);
        }
        finally
        {
            await CleanupProductAsync(product.Id);
        }
    }

    [Fact]
    public async Task CancelOrder_ShouldRestoreStockAtomically_AndRejectDoubleCancel()
    {
        var client = _factory.CreateClient();
        var sku = $"CANC-{Guid.NewGuid():N}"[..16];

        var createResponse = await client.PostAsJsonAsync("/api/products", new CreateProductRequest(
            Name: "Mouse Logitech MX",
            Sku: sku,
            Price: 550.00m,
            InitialStock: 4));

        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        try
        {
            var orderRes = await client.PostAsJsonAsync("/api/orders", new CreateOrderRequest(
                product.Id, 2, "cancel@stockguard.dev"));
            orderRes.EnsureSuccessStatusCode();
            var order = await orderRes.Content.ReadFromJsonAsync<OrderResponse>();
            Assert.NotNull(order);

            var cancelTasks = Enumerable.Range(0, 3)
                .Select(_ => client.PostAsync($"/api/orders/{order.Id}/cancel", null))
                .ToArray();
            var cancelResponses = await Task.WhenAll(cancelTasks);

            Assert.Equal(1, cancelResponses.Count(r => r.StatusCode == HttpStatusCode.OK));
            Assert.Equal(2, cancelResponses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

            var restoredProduct = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{product.Id}");
            Assert.NotNull(restoredProduct);
            Assert.Equal(4, restoredProduct.StockQuantity);
        }
        finally
        {
            await CleanupProductAsync(product.Id);
        }
    }

    private async Task CleanupProductAsync(Guid productId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockGuardDbContext>();
        await db.StockMovements.Where(m => m.ProductId == productId).ExecuteDeleteAsync();
        await db.Orders.Where(o => o.ProductId == productId).ExecuteDeleteAsync();
        await db.Products.Where(p => p.Id == productId).ExecuteDeleteAsync();
    }
}
