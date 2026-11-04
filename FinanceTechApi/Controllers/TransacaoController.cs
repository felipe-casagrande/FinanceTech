using System.IdentityModel.Tokens.Jwt;
using FinanceTechApi.Data;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTechApi.Controllers
{
    [ApiController]
    [Route("api/transacoes")]
    [Authorize]
    public class TransacaoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransacaoController(AppDbContext context)
        {
            _context = context;
        }

        private int ObterUsuarioId()
        {
            string? id = User.FindFirst(
                JwtRegisteredClaimNames.Sub
            )?.Value;

            return int.Parse(id!);
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            DateTime? dataInicio,
            DateTime? dataFim,
            string? categoria)
        {
            int usuarioId = ObterUsuarioId();

            var query = _context.Transacoes
                .Where(t => t.UsuarioId == usuarioId);

            if (dataInicio.HasValue)
            {
                query = query.Where(
                    t => t.Data >= dataInicio.Value
                );
            }

            if (dataFim.HasValue)
            {
                query = query.Where(
                    t => t.Data <= dataFim.Value
                );
            }

            if (!string.IsNullOrWhiteSpace(categoria))
            {
                query = query.Where(
                    t => t.Categoria == categoria
                );
            }

            var transacoes = await query
                .OrderByDescending(t => t.Data)
                .ToListAsync();

            return Ok(transacoes);
        }

        [HttpPost]
        public async Task<IActionResult> Post(Transacao transacao)
        {
            int usuarioId = ObterUsuarioId();

            transacao.UsuarioId = usuarioId;

            _context.Transacoes.Add(transacao);

            await _context.SaveChangesAsync();

            return Ok(transacao);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put(
            int id,
            Transacao transacao)
        {
            int usuarioId = ObterUsuarioId();

            var existente = await _context.Transacoes
                .FirstOrDefaultAsync(
                    t => t.Id == id && t.UsuarioId == usuarioId
                );

            if (existente == null)
            {
                return NotFound();
            }

            existente.Tipo = transacao.Tipo;
            existente.Valor = transacao.Valor;
            existente.Data = transacao.Data;
            existente.Categoria = transacao.Categoria;
            existente.Descricao = transacao.Descricao;

            await _context.SaveChangesAsync();

            return Ok(existente);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            int usuarioId = ObterUsuarioId();

            var transacao = await _context.Transacoes
                .FirstOrDefaultAsync(
                    t => t.Id == id && t.UsuarioId == usuarioId
                );

            if (transacao == null)
            {
                return NotFound();
            }

            _context.Transacoes.Remove(transacao);

            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}