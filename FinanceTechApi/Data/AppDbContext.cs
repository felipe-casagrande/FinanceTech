using Microsoft.EntityFrameworkCore;
using FinanceTechApi.Models;

namespace FinanceTechApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Transacao> Transacoes { get; set; }
    }
}