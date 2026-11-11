
using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class Carteira
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Descricao { get; set; } = string.Empty;

        [Required]
        public int UsuarioId { get; set; }

        public decimal SaldoInicial { get; set; } = 0;

        public bool Arquivada { get; set; } = false;

        public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    }
}
