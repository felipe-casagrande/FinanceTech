using System.ComponentModel.DataAnnotations;
namespace FinanceTechApi.Models;
public class OrcamentoMensal {
 public int Id { get; set; }
 public int UsuarioId { get; set; }
 [Required, MaxLength(80)] public string Categoria { get; set; } = "";
 [Required, MaxLength(7)] public string Mes { get; set; } = "";
 public decimal Limite { get; set; }
}
