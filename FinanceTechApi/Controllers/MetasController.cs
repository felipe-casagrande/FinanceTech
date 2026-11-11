
using System.IdentityModel.Tokens.Jwt;
using FinanceTechApi.Data;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTechApi.Controllers;

[ApiController]
[Authorize]
[Route("api/metas")]
public class MetasController(AppDbContext db) : ControllerBase
{
    private int UsuarioId =>
        int.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)!.Value);

    public record CriarMeta(string Nome, decimal ValorAlvo, DateOnly? Prazo);
    public record Aporte(decimal Valor);

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var metas = await db.MetasFinanceiras
            .AsNoTracking()
            .Where(m => m.UsuarioId == UsuarioId)
            .OrderBy(m => m.Id)
            .ToListAsync();

        return Ok(metas);
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarMeta entrada)
    {
        if (string.IsNullOrWhiteSpace(entrada.Nome) ||
            entrada.Nome.Trim().Length > 100 ||
            entrada.ValorAlvo <= 0)
        {
            return BadRequest("Informe nome e valor-alvo positivo.");
        }

        var meta = new MetaFinanceira
        {
            UsuarioId = UsuarioId,
            Nome = entrada.Nome.Trim(),
            ValorAlvo = entrada.ValorAlvo,
            Prazo = entrada.Prazo
        };

        db.MetasFinanceiras.Add(meta);
        await db.SaveChangesAsync();

        return Ok(meta);
    }

    [HttpPost("{id:int}/aportes")]
    public async Task<IActionResult> Aportar(int id, Aporte entrada)
    {
        if (entrada.Valor <= 0)
            return BadRequest("O aporte deve ser positivo.");

        var meta = await db.MetasFinanceiras
            .FirstOrDefaultAsync(m =>
                m.Id == id && m.UsuarioId == UsuarioId);

        if (meta == null)
            return NotFound();

        meta.ValorAtual += entrada.Valor;

        await db.SaveChangesAsync();

        return Ok(meta);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        var meta = await db.MetasFinanceiras
            .FirstOrDefaultAsync(m =>
                m.Id == id && m.UsuarioId == UsuarioId);

        if (meta == null)
            return NotFound();

        db.MetasFinanceiras.Remove(meta);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
