using Microsoft.EntityFrameworkCore;
using StockGuard.Application.DTOs;
using StockGuard.Application.Interfaces;
using StockGuard.Domain.Entities;
using StockGuard.Domain.Enums;
using StockGuard.Domain.Exceptions;
using StockGuard.Infrastructure.Persistence;

namespace StockGuard.Infrastructure.Services;

public class StockService(StockGuardDbContext db) : IStockService
{
    public async Task<ProductResponse> CreateProductAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var skuExists = await db.Products.AnyAsync(p => p.Sku == normalizedSku, ct);
        if (skuExists)
            throw new ConflictException($"Já existe um produto cadastrado com o SKU '{normalizedSku}'.");

        var product = new Product(request.Name, normalizedSku, request.Price, request.InitialStock);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.Products.Add(product);

        if (request.InitialStock > 0)
        {
            db.StockMovements.Add(new StockMovement(product.Id, request.InitialStock, StockMovementType.Initial));
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return MapProduct(product);
    }

    public async Task<IReadOnlyList<ProductResponse>> GetProductsAsync(CancellationToken ct = default)
    {
        return await db.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => MapProduct(p))
            .ToListAsync(ct);
    }

    public async Task<ProductResponse> GetProductByIdAsync(Guid id, CancellationToken ct = default)
    {
        var product = await db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Produto {id} não encontrado.");

        return MapProduct(product);
    }

    public async Task<ProductResponse> RestockAsync(Guid productId, RestockRequest request, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var updatedRows = await db.Products
            .Where(p => p.Id == productId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity + request.Quantity)
                .SetProperty(p => p.UpdatedAtUtc, DateTime.UtcNow), ct);

        if (updatedRows == 0)
            throw new NotFoundException($"Produto {productId} não encontrado.");

        db.StockMovements.Add(new StockMovement(productId, request.Quantity, StockMovementType.Restock));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var updated = await db.Products.AsNoTracking().FirstAsync(p => p.Id == productId, ct);
        return MapProduct(updated);
    }

    public async Task<OrderResponse> PlaceOrderAsync(CreateOrderRequest request, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // Atualização atômica condicional no PostgreSQL: adquire lock de linha e só
        // decrementa se StockQuantity >= request.Quantity, eliminando race conditions.
        var updatedRows = await db.Products
            .Where(p => p.Id == request.ProductId && p.StockQuantity >= request.Quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity - request.Quantity)
                .SetProperty(p => p.UpdatedAtUtc, DateTime.UtcNow), ct);

        if (updatedRows == 0)
        {
            var productSnapshot = await db.Products
                .AsNoTracking()
                .Where(p => p.Id == request.ProductId)
                .Select(p => new { p.StockQuantity })
                .FirstOrDefaultAsync(ct);

            if (productSnapshot is null)
                throw new NotFoundException($"Produto {request.ProductId} não encontrado.");

            throw new InsufficientStockException(request.ProductId, request.Quantity, productSnapshot.StockQuantity);
        }

        var product = await db.Products
            .AsNoTracking()
            .Where(p => p.Id == request.ProductId)
            .Select(p => new { p.Name, p.Price })
            .FirstAsync(ct);

        var order = new Order(request.ProductId, request.Quantity, product.Price, request.CustomerEmail);
        var movement = new StockMovement(request.ProductId, -request.Quantity, StockMovementType.Sale, order.Id);

        db.Orders.Add(order);
        db.StockMovements.Add(movement);

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return new OrderResponse(
            order.Id,
            order.ProductId,
            product.Name,
            order.Quantity,
            order.UnitPrice,
            order.TotalPrice,
            order.CustomerEmail,
            order.Status,
            order.CreatedAtUtc);
    }

    public async Task<IReadOnlyList<OrderResponse>> GetOrdersAsync(CancellationToken ct = default)
    {
        return await db.Orders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new OrderResponse(
                o.Id,
                o.ProductId,
                o.Product != null ? o.Product.Name : string.Empty,
                o.Quantity,
                o.UnitPrice,
                o.TotalPrice,
                o.CustomerEmail,
                o.Status,
                o.CreatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StockMovementResponse>> GetMovementsAsync(CancellationToken ct = default)
    {
        return await db.StockMovements
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAtUtc)
            .Join(
                db.Products.AsNoTracking(),
                m => m.ProductId,
                p => p.Id,
                (m, p) => new StockMovementResponse(
                    m.Id,
                    m.ProductId,
                    p.Name,
                    m.QuantityDelta,
                    m.Type,
                    m.ReferenceOrderId,
                    m.CreatedAtUtc))
            .ToListAsync(ct);
    }

    private static ProductResponse MapProduct(Product product) =>
        new(product.Id, product.Name, product.Sku, product.Price, product.StockQuantity, product.CreatedAtUtc, product.UpdatedAtUtc);
}
