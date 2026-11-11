
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
        public DbSet<Feedback> Feedbacks { get; set; }
        public DbSet<MetaFinanceira> MetasFinanceiras { get; set; }
        public DbSet<OrcamentoMensal> OrcamentosMensais { get; set; }
        public DbSet<Carteira> Carteiras { get; set; }

        // Cofrinhos
        public DbSet<Cofrinho> Cofrinhos { get; set; }
        public DbSet<MovimentacaoCofrinho> MovimentacoesCofrinho { get; set; }

        // Transferências entre carteiras
        public DbSet<TransferenciaCarteira> TransferenciasCarteira { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Feedback>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(f => f.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MetaFinanceira>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(m => m.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrcamentoMensal>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(o => o.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrcamentoMensal>()
                .HasIndex(o => new
                {
                    o.UsuarioId,
                    o.Categoria,
                    o.Mes
                })
                .IsUnique();

            // =====================================
            // TRANSAÇÕES
            // =====================================

            modelBuilder.Entity<Transacao>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(t => t.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Transacao>()
                .HasOne<Carteira>()
                .WithMany()
                .HasForeignKey(t => t.CarteiraId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transacao>()
                .HasIndex(t => new
                {
                    t.UsuarioId,
                    t.CarteiraId
                });

            // =====================================
            // CARTEIRAS
            // =====================================

            modelBuilder.Entity<Carteira>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(c => c.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Carteira>()
                .HasIndex(c => c.UsuarioId);

            modelBuilder.Entity<Carteira>()
                .Property(c => c.SaldoInicial)
                .HasPrecision(18, 2);

            // =====================================
            // COFRINHOS
            // =====================================

            modelBuilder.Entity<Cofrinho>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(c => c.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Cofrinho>()
                .HasOne<Carteira>()
                .WithMany()
                .HasForeignKey(c => c.CarteiraId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Cofrinho>()
                .HasIndex(c => new
                {
                    c.UsuarioId,
                    c.CarteiraId
                });

            modelBuilder.Entity<Cofrinho>()
                .Property(c => c.ValorObjetivo)
                .HasPrecision(18, 2);

            // =====================================
            // MOVIMENTAÇÕES DOS COFRINHOS
            // =====================================

            modelBuilder.Entity<MovimentacaoCofrinho>()
                .HasOne<Cofrinho>()
                .WithMany()
                .HasForeignKey(m => m.CofrinhoId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MovimentacaoCofrinho>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(m => m.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovimentacaoCofrinho>()
                .HasIndex(m => new
                {
                    m.UsuarioId,
                    m.CofrinhoId
                });

            modelBuilder.Entity<MovimentacaoCofrinho>()
                .Property(m => m.Valor)
                .HasPrecision(18, 2);

            // =====================================
            // TRANSFERÊNCIAS ENTRE CARTEIRAS
            // =====================================

            modelBuilder.Entity<TransferenciaCarteira>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(t => t.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TransferenciaCarteira>()
                .HasOne<Carteira>()
                .WithMany()
                .HasForeignKey(t => t.CarteiraOrigemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransferenciaCarteira>()
                .HasOne<Carteira>()
                .WithMany()
                .HasForeignKey(t => t.CarteiraDestinoId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransferenciaCarteira>()
                .HasIndex(t => new
                {
                    t.UsuarioId,
                    t.CarteiraOrigemId
                });

            modelBuilder.Entity<TransferenciaCarteira>()
                .HasIndex(t => new
                {
                    t.UsuarioId,
                    t.CarteiraDestinoId
                });

            modelBuilder.Entity<TransferenciaCarteira>()
                .Property(t => t.Valor)
                .HasPrecision(18, 2);
        }
    }
}
