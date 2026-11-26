using StockGuard.Domain.Enums;

namespace StockGuard.Application.DTOs;

public record StockMovementResponse(
    Guid Id,
    Guid ProductId,
    string ProductName,
    int QuantityDelta,
    StockMovementType Type,
    Guid? ReferenceOrderId,
    DateTime CreatedAtUtc
);
