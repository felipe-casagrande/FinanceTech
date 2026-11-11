
using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class Cofrinho
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Descricao { get; set; } = string.Empty;

        public decimal? ValorObjetivo { get; set; }

        public int UsuarioId { get; set; }

        public int CarteiraId { get; set; }

        public bool Arquivado { get; set; } = false;

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
