using Microsoft.AspNetCore.Mvc;
using StockGuard.Application.DTOs;
using StockGuard.Application.Interfaces;

namespace StockGuard.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController(IStockService stockService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<OrderResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetAll(CancellationToken ct)
    {
        var orders = await stockService.GetOrdersAsync(ct);
        return Ok(orders);
    }

    [HttpPost]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderResponse>> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var order = await stockService.PlaceOrderAsync(request, ct);
        return Created($"/api/orders/{order.Id}", order);
    }
}
