using System.ComponentModel.DataAnnotations;
namespace FinanceTechApi.Models;
public class MetaFinanceira {
 public int Id { get; set; }
 public int UsuarioId { get; set; }
 [Required, MaxLength(100)] public string Nome { get; set; } = "";
 public decimal ValorAlvo { get; set; }
 public decimal ValorAtual { get; set; }
 public DateOnly? Prazo { get; set; }
}
