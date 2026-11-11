
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
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

        private int? ObterUsuarioId()
        {
            string? id = User.FindFirst(
                JwtRegisteredClaimNames.Sub
            )?.Value;

            return int.TryParse(id, out int usuarioId)
                ? usuarioId
                : null;
        }

        private async Task<Carteira> ObterCarteiraPrincipal(
            int usuarioId)
        {
            var principal = await _context.Carteiras
                .FirstOrDefaultAsync(c =>
                    c.UsuarioId == usuarioId &&
                    c.Nome == "Principal");

            if (principal != null)
                return principal;

            principal = new Carteira
            {
                Nome = "Principal",
                Descricao = "Carteira principal do FinanceTech",
                UsuarioId = usuarioId,
                SaldoInicial = 0,
                CriadaEm = DateTime.UtcNow
            };

            _context.Carteiras.Add(principal);
            await _context.SaveChangesAsync();

            return principal;
        }

        // Bloqueia uma carteira durante a operação financeira.
        private async Task<Carteira?> BloquearCarteira(
            int carteiraId,
            int usuarioId)
        {
            return await _context.Carteiras
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Carteiras""
                       WHERE ""Id"" = {carteiraId}
                         AND ""UsuarioId"" = {usuarioId}
                       FOR UPDATE")
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        // Calcula o saldo disponível, incluindo transferências
        // e descontando os valores reservados nos cofrinhos.
        private async Task<decimal> CalcularSaldoDisponivel(
            int carteiraId,
            int usuarioId)
        {
            var saldoInicial = await _context.Carteiras
                .Where(c =>
                    c.Id == carteiraId &&
                    c.UsuarioId == usuarioId)
                .Select(c => c.SaldoInicial)
                .FirstAsync();

            var saldoTransacoes = await _context.Transacoes
                .Where(t =>
                    t.UsuarioId == usuarioId &&
                    t.CarteiraId == carteiraId)
                .SumAsync(t => (decimal?)(
                    t.Tipo == "Receita"
                        ? t.Valor
                        : -t.Valor
                )) ?? 0m;

            var transferenciasRecebidas =
                await _context.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId &&
                        t.CarteiraDestinoId == carteiraId)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            var transferenciasEnviadas =
                await _context.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId &&
                        t.CarteiraOrigemId == carteiraId)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            var saldoReservado =
                await _context.MovimentacoesCofrinho
                    .Where(m =>
                        m.UsuarioId == usuarioId &&
                        _context.Cofrinhos.Any(c =>
                            c.Id == m.CofrinhoId &&
                            c.UsuarioId == usuarioId &&
                            c.CarteiraId == carteiraId))
                    .SumAsync(m => (decimal?)(
                        m.Tipo == "Deposito"
                            ? m.Valor
                            : -m.Valor
                    )) ?? 0m;

            return saldoInicial
                + saldoTransacoes
                + transferenciasRecebidas
                - transferenciasEnviadas
                - saldoReservado;
        }

        private static decimal EfeitoTransacao(
            string tipo,
            decimal valor)
        {
            return tipo == "Receita" ? valor : -valor;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            DateTime? dataInicio,
            DateTime? dataFim,
            string? categoria,
            int? carteiraId)
        {
            int? usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var query = _context.Transacoes
                .AsNoTracking()
                .Where(t => t.UsuarioId == usuarioId.Value);

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

            if (carteiraId.HasValue)
            {
                bool pertenceAoUsuario =
                    await _context.Carteiras.AnyAsync(c =>
                        c.Id == carteiraId.Value &&
                        c.UsuarioId == usuarioId.Value);

                if (!pertenceAoUsuario)
                    return NotFound("Carteira não encontrada.");

                query = query.Where(
                    t => t.CarteiraId == carteiraId.Value
                );
            }

            var transacoes = await query
                .OrderByDescending(t => t.Data)
                .ToListAsync();

            return Ok(transacoes);
        }

        [HttpPost]
        public async Task<IActionResult> Post(
            [FromBody] Transacao transacao)
        {
            int? usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (transacao.Tipo != "Receita" &&
                transacao.Tipo != "Despesa")
            {
                return BadRequest(
                    "O tipo deve ser Receita ou Despesa.");
            }

            if (transacao.Valor <= 0)
                return BadRequest("O valor deve ser maior que zero.");

            await using var operacao = await _context.Database
                .BeginTransactionAsync();

            Carteira? carteira;

            if (transacao.CarteiraId.HasValue)
            {
                carteira = await BloquearCarteira(
                    transacao.CarteiraId.Value,
                    usuarioId.Value);
            }
            else
            {
                var principal = await ObterCarteiraPrincipal(
                    usuarioId.Value);

                carteira = await BloquearCarteira(
                    principal.Id,
                    usuarioId.Value);
            }

            if (carteira == null)
                return BadRequest("Carteira inválida.");

            if (carteira.Arquivada)
            {
                return BadRequest(
                    "Não é possível adicionar transações em uma carteira arquivada.");
            }

            if (transacao.Tipo == "Despesa")
            {
                var saldoDisponivel =
                    await CalcularSaldoDisponivel(
                        carteira.Id,
                        usuarioId.Value);

                if (transacao.Valor > saldoDisponivel)
                {
                    return BadRequest(
                        "Saldo disponível insuficiente. " +
                        "O dinheiro reservado nos cofrinhos não pode ser utilizado.");
                }
            }

            transacao.Id = 0;
            transacao.UsuarioId = usuarioId.Value;
            transacao.CarteiraId = carteira.Id;

            _context.Transacoes.Add(transacao);

            await _context.SaveChangesAsync();
            await operacao.CommitAsync();

            return Ok(transacao);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Put(
            int id,
            [FromBody] Transacao transacao)
        {
            int? usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (transacao.Tipo != "Receita" &&
                transacao.Tipo != "Despesa")
            {
                return BadRequest(
                    "O tipo deve ser Receita ou Despesa.");
            }

            if (transacao.Valor <= 0)
                return BadRequest("O valor deve ser maior que zero.");

            await using var operacao = await _context.Database
                .BeginTransactionAsync();

            var existente = await _context.Transacoes
                .FirstOrDefaultAsync(t =>
                    t.Id == id &&
                    t.UsuarioId == usuarioId.Value);

            if (existente == null)
                return NotFound("Transação não encontrada.");

            // Mantém a carteira atual se o frontend
            // não informar uma nova carteira.
            int? carteiraDestinoId =
                transacao.CarteiraId ?? existente.CarteiraId;

            if (!carteiraDestinoId.HasValue)
            {
                var principal = await ObterCarteiraPrincipal(
                    usuarioId.Value);

                carteiraDestinoId = principal.Id;
            }

            // Caso uma transação antiga não tenha carteira,
            // considera a carteira Principal.
            int carteiraOrigemId;

            if (existente.CarteiraId.HasValue)
            {
                carteiraOrigemId = existente.CarteiraId.Value;
            }
            else
            {
                var principal = await ObterCarteiraPrincipal(
                    usuarioId.Value);

                carteiraOrigemId = principal.Id;
            }

            // Bloqueia as carteiras em ordem crescente
            // para evitar conflitos entre operações.
            var primeiroId = Math.Min(
                carteiraOrigemId,
                carteiraDestinoId.Value);

            var segundoId = Math.Max(
                carteiraOrigemId,
                carteiraDestinoId.Value);

            var primeira = await BloquearCarteira(
                primeiroId,
                usuarioId.Value);

            if (primeira == null)
                return BadRequest("Carteira inválida.");

            Carteira? segunda = null;

            if (segundoId != primeiroId)
            {
                segunda = await BloquearCarteira(
                    segundoId,
                    usuarioId.Value);

                if (segunda == null)
                    return BadRequest("Carteira inválida.");
            }

            var carteiraOrigem =
                primeira.Id == carteiraOrigemId
                    ? primeira
                    : segunda!;

            var carteiraDestino =
                primeira.Id == carteiraDestinoId.Value
                    ? primeira
                    : segunda!;

            if (carteiraOrigem.Arquivada ||
                carteiraDestino.Arquivada)
            {
                return BadRequest(
                    "Não é possível editar transações envolvendo carteiras arquivadas.");
            }

            var saldoOrigem = await CalcularSaldoDisponivel(
                carteiraOrigemId,
                usuarioId.Value);

            var saldoDestino = carteiraOrigemId == carteiraDestinoId.Value
                ? saldoOrigem
                : await CalcularSaldoDisponivel(
                    carteiraDestinoId.Value,
                    usuarioId.Value);

            var efeitoAnterior = EfeitoTransacao(
                existente.Tipo,
                existente.Valor);

            var efeitoNovo = EfeitoTransacao(
                transacao.Tipo,
                transacao.Valor);

            // Remove o efeito antigo da carteira de origem.
            var saldoFinalOrigem = saldoOrigem - efeitoAnterior;

            // Aplica o novo efeito na carteira de destino.
            if (carteiraOrigemId == carteiraDestinoId.Value)
            {
                saldoFinalOrigem += efeitoNovo;

                if (saldoFinalOrigem < 0)
                {
                    return BadRequest(
                        "A edição deixaria o saldo disponível negativo.");
                }
            }
            else
            {
                var saldoFinalDestino = saldoDestino + efeitoNovo;

                if (saldoFinalOrigem < 0 ||
                    saldoFinalDestino < 0)
                {
                    return BadRequest(
                        "A edição deixaria uma das carteiras com saldo disponível negativo.");
                }
            }

            existente.Tipo = transacao.Tipo;
            existente.Valor = transacao.Valor;
            existente.Data = transacao.Data;
            existente.Categoria = transacao.Categoria;
            existente.Descricao = transacao.Descricao;
            existente.CarteiraId = carteiraDestino.Id;

            await _context.SaveChangesAsync();
            await operacao.CommitAsync();

            return Ok(existente);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            int? usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            await using var operacao = await _context.Database
                .BeginTransactionAsync();

            var transacao = await _context.Transacoes
                .FirstOrDefaultAsync(t =>
                    t.Id == id &&
                    t.UsuarioId == usuarioId.Value);

            if (transacao == null)
                return NotFound("Transação não encontrada.");

            int carteiraId;

            if (transacao.CarteiraId.HasValue)
            {
                carteiraId = transacao.CarteiraId.Value;
            }
            else
            {
                var principal = await ObterCarteiraPrincipal(
                    usuarioId.Value);

                carteiraId = principal.Id;
            }

            var carteira = await BloquearCarteira(
                carteiraId,
                usuarioId.Value);

            if (carteira == null)
                return BadRequest("Carteira inválida.");

            if (carteira.Arquivada)
            {
                return BadRequest(
                    "Não é possível excluir transações de uma carteira arquivada.");
            }

            // Excluir uma receita reduz o saldo.
            // Excluir uma despesa devolve o dinheiro.
            if (transacao.Tipo == "Receita")
            {
                var saldoDisponivel =
                    await CalcularSaldoDisponivel(
                        carteiraId,
                        usuarioId.Value);

                if (transacao.Valor > saldoDisponivel)
                {
                    return BadRequest(
                        "Não é possível excluir esta receita, pois isso deixaria o saldo disponível negativo.");
                }
            }

            _context.Transacoes.Remove(transacao);

            await _context.SaveChangesAsync();
            await operacao.CommitAsync();

            return Ok();
        }
    }
}
