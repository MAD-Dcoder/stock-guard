using StockGuard.Application.DTOs;

namespace StockGuard.Application.Interfaces;

public interface IStockService
{
    Task<ProductResponse> CreateProductAsync(CreateProductRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ProductResponse>> GetProductsAsync(CancellationToken ct = default);
    Task<ProductResponse> GetProductByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductResponse> RestockAsync(Guid productId, RestockRequest request, CancellationToken ct = default);
    Task<OrderResponse> PlaceOrderAsync(CreateOrderRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<OrderResponse>> GetOrdersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<StockMovementResponse>> GetMovementsAsync(CancellationToken ct = default);
}
