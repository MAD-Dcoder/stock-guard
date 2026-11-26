namespace StockGuard.Domain.Exceptions;

public class DomainException(string message) : Exception(message);

public class NotFoundException(string message) : DomainException(message);

public class ConflictException(string message) : DomainException(message);

public class InsufficientStockException(Guid productId, int requested, int available)
    : ConflictException($"Estoque insuficiente para o produto {productId}. Solicitado: {requested}, disponível: {available}.");
