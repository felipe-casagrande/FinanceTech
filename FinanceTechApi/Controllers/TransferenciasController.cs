
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FinanceTechApi.Data;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceTechApi.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/transferencias")]
    public class TransferenciasController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TransferenciasController(AppDbContext db)
        {
            _db = db;
        }

        private int? ObterUsuarioId()
        {
            var valor = User.FindFirstValue("sub")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(valor, out var id) ? id : null;
        }

        // Histórico de transferências do usuário
        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var transferencias = await _db.TransferenciasCarteira
                .AsNoTracking()
                .Where(t => t.UsuarioId == usuarioId.Value)
                .OrderByDescending(t => t.Data)
                .ThenByDescending(t => t.Id)
                .Select(t => new
                {
                    t.Id,
                    t.CarteiraOrigemId,
                    NomeCarteiraOrigem = _db.Carteiras
                        .Where(c => c.Id == t.CarteiraOrigemId)
                        .Select(c => c.Nome)
                        .FirstOrDefault(),
                    t.CarteiraDestinoId,
                    NomeCarteiraDestino = _db.Carteiras
                        .Where(c => c.Id == t.CarteiraDestinoId)
                        .Select(c => c.Nome)
                        .FirstOrDefault(),
                    t.Valor,
                    t.Descricao,
                    t.Data
                })
                .ToListAsync();

            return Ok(transferencias);
        }

        // Consultar uma transferência específica
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var transferencia = await _db.TransferenciasCarteira
                .AsNoTracking()
                .Where(t =>
                    t.Id == id &&
                    t.UsuarioId == usuarioId.Value)
                .Select(t => new
                {
                    t.Id,
                    t.CarteiraOrigemId,
                    t.CarteiraDestinoId,
                    t.Valor,
                    t.Descricao,
                    t.Data
                })
                .FirstOrDefaultAsync();

            if (transferencia == null)
                return NotFound("Transferência não encontrada.");

            return Ok(transferencia);
        }

        // Transferir dinheiro entre carteiras
        [HttpPost]
        public async Task<IActionResult> Transferir(
            [FromBody] TransferenciaRequest request)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (request.Valor <= 0)
                return BadRequest("O valor deve ser maior que zero.");

            if (request.CarteiraOrigemId == request.CarteiraDestinoId)
            {
                return BadRequest(
                    "A carteira de origem deve ser diferente da carteira de destino."
                );
            }

            await using var transacao = await _db.Database
                .BeginTransactionAsync();

            // Bloqueia as duas carteiras em ordem de ID.
            // Isso evita que transferências simultâneas
            // utilizem o mesmo saldo disponível.
            var primeiroId = Math.Min(
                request.CarteiraOrigemId,
                request.CarteiraDestinoId
            );

            var segundoId = Math.Max(
                request.CarteiraOrigemId,
                request.CarteiraDestinoId
            );

            var primeiraCarteira = await _db.Carteiras
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Carteiras""
                       WHERE ""Id"" = {primeiroId}
                         AND ""UsuarioId"" = {usuarioId.Value}
                       FOR UPDATE")
                .AsNoTracking()
                .FirstOrDefaultAsync();

            var segundaCarteira = await _db.Carteiras
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Carteiras""
                       WHERE ""Id"" = {segundoId}
                         AND ""UsuarioId"" = {usuarioId.Value}
                       FOR UPDATE")
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (primeiraCarteira == null || segundaCarteira == null)
                return BadRequest("Uma das carteiras não foi encontrada.");

            var origem = primeiraCarteira.Id == request.CarteiraOrigemId
                ? primeiraCarteira
                : segundaCarteira;

            var destino = primeiraCarteira.Id == request.CarteiraDestinoId
                ? primeiraCarteira
                : segundaCarteira;

            if (origem.Arquivada || destino.Arquivada)
            {
                return BadRequest(
                    "Não é possível transferir dinheiro envolvendo carteiras arquivadas."
                );
            }

            // Receitas e despesas da carteira de origem
            var saldoTransacoes = await _db.Transacoes
                .Where(t =>
                    t.UsuarioId == usuarioId.Value &&
                    t.CarteiraId == origem.Id)
                .SumAsync(t => (decimal?)(
                    t.Tipo == "Receita"
                        ? t.Valor
                        : -t.Valor
                )) ?? 0m;

            // Transferências recebidas
            var transferenciasRecebidas =
                await _db.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId.Value &&
                        t.CarteiraDestinoId == origem.Id)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            // Transferências enviadas
            var transferenciasEnviadas =
                await _db.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId.Value &&
                        t.CarteiraOrigemId == origem.Id)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            var saldoTotalOrigem = origem.SaldoInicial
                + saldoTransacoes
                + transferenciasRecebidas
                - transferenciasEnviadas;

            // Dinheiro reservado nos cofrinhos da origem
            var saldoReservado = await _db.MovimentacoesCofrinho
                .Where(m =>
                    m.UsuarioId == usuarioId.Value &&
                    _db.Cofrinhos.Any(c =>
                        c.Id == m.CofrinhoId &&
                        c.UsuarioId == usuarioId.Value &&
                        c.CarteiraId == origem.Id))
                .SumAsync(m => (decimal?)(
                    m.Tipo == "Deposito"
                        ? m.Valor
                        : -m.Valor
                )) ?? 0m;

            var saldoDisponivel = saldoTotalOrigem - saldoReservado;

            if (request.Valor > saldoDisponivel)
            {
                return BadRequest(
                    "Saldo disponível insuficiente na carteira de origem."
                );
            }

            // Uma única operação representa a saída e a entrada.
            var transferencia = new TransferenciaCarteira
            {
                UsuarioId = usuarioId.Value,
                CarteiraOrigemId = origem.Id,
                CarteiraDestinoId = destino.Id,
                Valor = request.Valor,
                Descricao = request.Descricao?.Trim() ?? "",
                Data = DateTime.UtcNow
            };

            _db.TransferenciasCarteira.Add(transferencia);

            await _db.SaveChangesAsync();
            await transacao.CommitAsync();

            return CreatedAtAction(
                nameof(Obter),
                new { id = transferencia.Id },
                new
                {
                    transferencia.Id,
                    transferencia.CarteiraOrigemId,
                    CarteiraOrigem = origem.Nome,
                    transferencia.CarteiraDestinoId,
                    CarteiraDestino = destino.Nome,
                    transferencia.Valor,
                    transferencia.Descricao,
                    transferencia.Data,
                    SaldoDisponivelOrigem =
                        saldoDisponivel - transferencia.Valor
                });
        }
    }

    public class TransferenciaRequest
    {
        [Range(1, int.MaxValue)]
        public int CarteiraOrigemId { get; set; }

        [Range(1, int.MaxValue)]
        public int CarteiraDestinoId { get; set; }

        [Range(
            typeof(decimal),
            "0.01",
            "79228162514264337593543950335",
            ParseLimitsInInvariantCulture = true,
            ErrorMessage = "O valor deve ser maior que zero."
        )]
        public decimal Valor { get; set; }

        [MaxLength(500)]
        public string? Descricao { get; set; }
    }
}
