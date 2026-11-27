using Microsoft.EntityFrameworkCore;
using StockGuard.Api.Middleware;
using StockGuard.Application.Interfaces;
using StockGuard.Infrastructure.Persistence;
using StockGuard.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' não configurada.");

builder.Services.AddDbContext<StockGuardDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IStockService, StockService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StockGuardDbContext>();
    await DbSeeder.SeedAsync(db);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.MapControllers();

app.MapGet("/health", async (StockGuardDbContext db, CancellationToken ct) =>
{
    var canConnect = await db.Database.CanConnectAsync(ct);
    return canConnect
        ? Results.Ok(new { status = "healthy", database = "connected", utc = DateTime.UtcNow })
        : Results.Json(new { status = "unhealthy", database = "disconnected", utc = DateTime.UtcNow }, statusCode: 503);
});

app.Run();

public partial class Program;
