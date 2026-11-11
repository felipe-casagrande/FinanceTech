using System.IdentityModel.Tokens.Jwt;
using FinanceTechApi.Data;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanceTechApi.Controllers;

[ApiController]
[Authorize]
[Route("api/feedbacks")]
public class FeedbackController(AppDbContext db) : ControllerBase
{
    public record CriarFeedback(string? Tipo, string? Mensagem);

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarFeedback entrada)
    {
        var tiposPermitidos = new[] { "Sugestão", "Problema", "Elogio" };
        var tipo = entrada.Tipo?.Trim();
        var mensagem = entrada.Mensagem?.Trim();
        if (tipo is null || !tiposPermitidos.Contains(tipo))
            return BadRequest("Tipo de feedback inválido.");
        if (string.IsNullOrWhiteSpace(mensagem) || mensagem.Length < 10 || mensagem.Length > 2000)
            return BadRequest("A mensagem deve conter entre 10 e 2000 caracteres.");
        var usuarioClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!int.TryParse(usuarioClaim, out var usuarioId))
            return Unauthorized();

        var feedback = new Feedback { UsuarioId = usuarioId, Tipo = tipo, Mensagem = mensagem, CriadoEm = DateTime.UtcNow };
        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync();
        return StatusCode(201, new { feedback.Id, Mensagem = "Feedback recebido com sucesso." });
    }
}
