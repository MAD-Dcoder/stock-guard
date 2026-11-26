using System.ComponentModel.DataAnnotations;
using StockGuard.Domain.Enums;

namespace StockGuard.Application.DTOs;

public record CreateOrderRequest(
    [Required]
    Guid ProductId,

    [Range(1, 10_000, ErrorMessage = "Quantidade deve ser pelo menos 1.")]
    int Quantity,

    [Required(ErrorMessage = "E-mail do cliente é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    string CustomerEmail
);

public record OrderResponse(
    Guid Id,
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string CustomerEmail,
    OrderStatus Status,
    DateTime CreatedAtUtc
);
