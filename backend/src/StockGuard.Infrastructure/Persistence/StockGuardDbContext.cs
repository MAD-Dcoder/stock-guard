using Microsoft.EntityFrameworkCore;
using StockGuard.Domain.Entities;

namespace StockGuard.Infrastructure.Persistence;

public class StockGuardDbContext(DbContextOptions<StockGuardDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products", t =>
                t.HasCheckConstraint("CK_products_stock_non_negative", "\"StockQuantity\" >= 0"));

            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).HasMaxLength(120).IsRequired();
            entity.Property(p => p.Sku).HasMaxLength(40).IsRequired();
            entity.HasIndex(p => p.Sku).IsUnique();
            entity.Property(p => p.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.UnitPrice).HasPrecision(18, 2);
            entity.Property(o => o.TotalPrice).HasPrecision(18, 2);
            entity.Property(o => o.CustomerEmail).HasMaxLength(200).IsRequired();
            entity.HasOne(o => o.Product)
                .WithMany()
                .HasForeignKey(o => o.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.ToTable("stock_movements");
            entity.HasKey(m => m.Id);
            entity.HasIndex(m => m.ProductId);
        });
    }
}
