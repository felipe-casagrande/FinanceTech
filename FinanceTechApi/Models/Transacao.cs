using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceTechApi.Models
{
    public class Transacao : IValidatableObject
    {
        public int Id { get; set; }

        [Required]
        public string Tipo { get; set; } = string.Empty;

        [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = "O valor deve ser maior que zero.")]
        public decimal Valor { get; set; }

        [Required]
        public DateTime Data { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Informe uma categoria.")]
        public string Categoria { get; set; } = string.Empty;

        public string Descricao { get; set; } = string.Empty;

        public int UsuarioId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(Categoria))
                yield return new ValidationResult("Informe uma categoria.", new[] { nameof(Categoria) });

            if (Data == default)
                yield return new ValidationResult("Informe uma data válida.", new[] { nameof(Data) });
        }
    }
}