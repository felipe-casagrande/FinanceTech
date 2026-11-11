
using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class MovimentacaoCofrinho
    {
        public int Id { get; set; }

        [Required]
        public int CofrinhoId { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Tipo { get; set; } = string.Empty;

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
