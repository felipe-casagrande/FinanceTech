
using System.IdentityModel.Tokens.Jwt;
using System.Text.RegularExpressions;
using FinanceTechApi.Data;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTechApi.Controllers;

[ApiController]
[Authorize]
[Route("api/orcamentos")]
public class OrcamentosController(AppDbContext db) : ControllerBase
{
    private int UsuarioId => int.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)!.Value);

    public record SalvarOrcamento(string Categoria, string Mes, decimal Limite);

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        return Ok(await db.OrcamentosMensais
            .AsNoTracking()
            .Where(o => o.UsuarioId == UsuarioId)
            .OrderByDescending(o => o.Mes)
            .ThenBy(o => o.Categoria)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Salvar(SalvarOrcamento entrada)
    {
        if (string.IsNullOrWhiteSpace(entrada.Categoria) ||
            entrada.Categoria.Trim().Length > 80 ||
            entrada.Limite <= 0 ||
            string.IsNullOrWhiteSpace(entrada.Mes) ||
            !Regex.IsMatch(entrada.Mes, @"^\d{4}-(0[1-9]|1[0-2])$"))
        {
            return BadRequest("Categoria, mês e limite devem ser válidos.");
        }

        var categoria = entrada.Categoria.Trim();
        var mes = entrada.Mes!;

        var existente = await db.OrcamentosMensais.FirstOrDefaultAsync(o =>
            o.UsuarioId == UsuarioId &&
            o.Categoria == categoria &&
            o.Mes == mes);

        if (existente != null)
        {
            existente.Limite = entrada.Limite;
            await db.SaveChangesAsync();
            return Ok(existente);
        }

        var orcamento = new OrcamentoMensal
        {
            UsuarioId = UsuarioId,
            Categoria = categoria,
            Mes = mes,
            Limite = entrada.Limite
        };

        db.OrcamentosMensais.Add(orcamento);
        await db.SaveChangesAsync();

        return Ok(orcamento);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        var item = await db.OrcamentosMensais.FirstOrDefaultAsync(o =>
            o.Id == id && o.UsuarioId == UsuarioId);

        if (item == null)
            return NotFound();

        db.OrcamentosMensais.Remove(item);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
