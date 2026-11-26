using Microsoft.AspNetCore.Mvc;
using StockGuard.Application.DTOs;
using StockGuard.Application.Interfaces;

namespace StockGuard.Api.Controllers;

[ApiController]
[Route("api/movements")]
public class StockMovementsController(IStockService stockService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<StockMovementResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StockMovementResponse>>> GetAll(CancellationToken ct)
    {
        var movements = await stockService.GetMovementsAsync(ct);
        return Ok(movements);
    }
}
