using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class Transacao
    {
        public int Id { get; set; }

        [Required]
        public string Tipo { get; set; } = string.Empty;

        [Required]
        public decimal Valor { get; set; }

        [Required]
        public DateTime Data { get; set; }

        public string Categoria { get; set; } = string.Empty;

        public string Descricao { get; set; } = string.Empty;

        public int UsuarioId { get; set; }
    }
}