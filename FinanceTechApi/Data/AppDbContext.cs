using Microsoft.EntityFrameworkCore;
using FinanceTechApi.Models;

namespace FinanceTechApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Transacao> Transacoes { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<MetaFinanceira> MetasFinanceiras { get; set; }
        public DbSet<OrcamentoMensal> OrcamentosMensais { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<MetaFinanceira>().HasOne<Usuario>().WithMany().HasForeignKey(m => m.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrcamentoMensal>().HasOne<Usuario>().WithMany().HasForeignKey(o => o.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrcamentoMensal>().HasIndex(o => new { o.UsuarioId, o.Categoria, o.Mes }).IsUnique();
            modelBuilder.Entity<Transacao>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(t => t.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}