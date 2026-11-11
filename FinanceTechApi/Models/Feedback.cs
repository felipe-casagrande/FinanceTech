using System.ComponentModel.DataAnnotations;
namespace FinanceTechApi.Models;
public class Feedback
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    [Required, MaxLength(30)] public string Tipo { get; set; } = string.Empty;
    [Required, MaxLength(2000)] public string Mensagem { get; set; } = string.Empty;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
