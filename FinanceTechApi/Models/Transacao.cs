using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class Transacao
    {
        public int Id { get; set; }
        
        [Required]
        public string Tipo { get; set; } // "Receita" ou "Despesa"
        
        [Required]
        public decimal Valor { get; set; }
        
        [Required]
        public DateTime Data { get; set; }
        
        public string Categoria { get; set; }
        public string Descricao { get; set; }
    }
}