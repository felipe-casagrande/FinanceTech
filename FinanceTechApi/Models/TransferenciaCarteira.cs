
using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class TransferenciaCarteira
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public int CarteiraOrigemId { get; set; }

        public int CarteiraDestinoId { get; set; }

        [Range(
            typeof(decimal),
            "0.01",
            "79228162514264337593543950335",
            ParseLimitsInInvariantCulture = true,
            ErrorMessage = "O valor deve ser maior que zero."
        )]
        public decimal Valor { get; set; }

        [MaxLength(500)]
        public string Descricao { get; set; } = string.Empty;

        public DateTime Data { get; set; } = DateTime.UtcNow;
    }
}
