using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceTechApi.Data;
using FinanceTechApi.Models;

namespace FinanceTechApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransacaoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransacaoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] DateTime? dataInicio, [FromQuery] DateTime? dataFim, [FromQuery] string? categoria)
        {
            var query = _context.Transacoes.AsQueryable();

            if (dataInicio.HasValue) 
                query = query.Where(t => t.Data >= dataInicio);
            
            if (dataFim.HasValue) 
                query = query.Where(t => t.Data <= dataFim);
            
            if (!string.IsNullOrEmpty(categoria) && categoria != "TODAS") 
                query = query.Where(t => t.Categoria == categoria);

            var resultado = await query.ToListAsync();
            return Ok(resultado);
        }

        [HttpPost]
        public async Task<IActionResult> CriarTransacao(Transacao transacao)
        {
            if (transacao.Valor <= 0) return BadRequest("O valor deve ser maior que zero.");

            _context.Transacoes.Add(transacao);
            await _context.SaveChangesAsync();
            return Ok(transacao);
        }

        // NOVO: Método PUT para atualizar registos existentes
        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarTransacao(int id, Transacao transacao)
        {
            if (id != transacao.Id) return BadRequest("O ID da transação não confere.");

            var transacaoExistente = await _context.Transacoes.FindAsync(id);
            if (transacaoExistente == null) return NotFound("Transação não encontrada.");

            transacaoExistente.Tipo = transacao.Tipo;
            transacaoExistente.Valor = transacao.Valor;
            transacaoExistente.Data = transacao.Data;
            transacaoExistente.Categoria = transacao.Categoria;
            transacaoExistente.Descricao = transacao.Descricao;

            await _context.SaveChangesAsync();
            return Ok(transacaoExistente);
        }

        // NOVO: Método DELETE para apagar registos do histórico
        [HttpDelete("{id}")]
        public async Task<IActionResult> ExcluirTransacao(int id)
        {
            var transacao = await _context.Transacoes.FindAsync(id);
            if (transacao == null) return NotFound("Transação não encontrada.");

            _context.Transacoes.Remove(transacao);
            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Transação excluída com sucesso!" });
        }
    }
}