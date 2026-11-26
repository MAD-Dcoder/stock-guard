using System.ComponentModel.DataAnnotations;

namespace StockGuard.Application.DTOs;

public record CreateProductRequest(
    [Required(ErrorMessage = "Nome é obrigatório.")]
    [StringLength(120, MinimumLength = 2)]
    string Name,

    [Required(ErrorMessage = "SKU é obrigatório.")]
    [StringLength(40, MinimumLength = 2)]
    string Sku,

    [Range(0.01, 1_000_000, ErrorMessage = "Preço deve ser maior que zero.")]
    decimal Price,

    [Range(0, 1_000_000, ErrorMessage = "Estoque inicial não pode ser negativo.")]
    int InitialStock
);

public record RestockRequest(
    [Range(1, 1_000_000, ErrorMessage = "Quantidade deve ser pelo menos 1.")]
    int Quantity
);

public record ProductResponse(
    Guid Id,
    string Name,
    string Sku,
    decimal Price,
    int StockQuantity,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
