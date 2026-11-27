using Microsoft.EntityFrameworkCore;
using StockGuard.Domain.Entities;
using StockGuard.Domain.Enums;

namespace StockGuard.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(StockGuardDbContext db, CancellationToken ct = default)
    {
        if (db.Database.IsRelational())
        {
            await db.Database.MigrateAsync(ct);
        }

        if (await db.Products.AnyAsync(ct))
        {
            return;
        }

        var initialProducts = new[]
        {
            new Product("iPhone 16 Pro 256GB", "IPH-16P-256", 8999.00m, 1),
            new Product("MacBook Air M3 16GB", "MBA-M3-16", 10499.00m, 3),
            new Product("Teclado Mecânico Keychron K2", "KEY-K2-BR", 649.90m, 8),
            new Product("Monitor Dell UltraSharp 27\" 4K", "DELL-U2723", 3290.00m, 5)
        };

        await db.Products.AddRangeAsync(initialProducts, ct);

        var movements = initialProducts.Select(p =>
            new StockMovement(p.Id, p.StockQuantity, StockMovementType.Initial));

        await db.StockMovements.AddRangeAsync(movements, ct);
        await db.SaveChangesAsync(ct);
    }
}
