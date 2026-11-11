
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
    [Route("api/carteiras")]
    public class CarteirasController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CarteirasController(AppDbContext db)
        {
            _db = db;
        }

        private int? ObterUsuarioId()
        {
            var valor = User.FindFirstValue("sub")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(valor, out var id) ? id : null;
        }

        private IQueryable<CarteiraResumo> ConsultarCarteiras(int usuarioId)
        {
            return _db.Carteiras
                .AsNoTracking()
                .Where(c => c.UsuarioId == usuarioId)
                .Select(c => new CarteiraResumo
                {
                    Id = c.Id,
                    Nome = c.Nome,
                    Descricao = c.Descricao,
                    SaldoInicial = c.SaldoInicial,
                    Arquivada = c.Arquivada,
                    CriadaEm = c.CriadaEm,

                    SaldoAtual =
                        c.SaldoInicial

                        + (_db.Transacoes
                            .Where(t =>
                                t.UsuarioId == usuarioId &&
                                t.CarteiraId == c.Id)
                            .Sum(t => (decimal?)(
                                t.Tipo == "Receita"
                                    ? t.Valor
                                    : -t.Valor
                            )) ?? 0m)

                        + (_db.TransferenciasCarteira
                            .Where(t =>
                                t.UsuarioId == usuarioId &&
                                t.CarteiraDestinoId == c.Id)
                            .Sum(t => (decimal?)t.Valor) ?? 0m)

                        - (_db.TransferenciasCarteira
                            .Where(t =>
                                t.UsuarioId == usuarioId &&
                                t.CarteiraOrigemId == c.Id)
                            .Sum(t => (decimal?)t.Valor) ?? 0m),

                    SaldoReservado =
                        (_db.MovimentacoesCofrinho
                            .Where(m =>
                                m.UsuarioId == usuarioId &&
                                _db.Cofrinhos.Any(co =>
                                    co.Id == m.CofrinhoId &&
                                    co.UsuarioId == usuarioId &&
                                    co.CarteiraId == c.Id))
                            .Sum(m => (decimal?)(
                                m.Tipo == "Deposito"
                                    ? m.Valor
                                    : -m.Valor
                            )) ?? 0m)
                });
        }

        // Calcula o saldo disponível considerando
        // transações, transferências e cofrinhos.
        private async Task<decimal> CalcularSaldoDisponivel(
            int carteiraId,
            int usuarioId,
            decimal novoSaldoInicial)
        {
            var saldoTransacoes = await _db.Transacoes
                .Where(t =>
                    t.UsuarioId == usuarioId &&
                    t.CarteiraId == carteiraId)
                .SumAsync(t => (decimal?)(
                    t.Tipo == "Receita"
                        ? t.Valor
                        : -t.Valor
                )) ?? 0m;

            var recebidas = await _db.TransferenciasCarteira
                .Where(t =>
                    t.UsuarioId == usuarioId &&
                    t.CarteiraDestinoId == carteiraId)
                .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            var enviadas = await _db.TransferenciasCarteira
                .Where(t =>
                    t.UsuarioId == usuarioId &&
                    t.CarteiraOrigemId == carteiraId)
                .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            var reservado = await _db.MovimentacoesCofrinho
                .Where(m =>
                    m.UsuarioId == usuarioId &&
                    _db.Cofrinhos.Any(c =>
                        c.Id == m.CofrinhoId &&
                        c.UsuarioId == usuarioId &&
                        c.CarteiraId == carteiraId))
                .SumAsync(m => (decimal?)(
                    m.Tipo == "Deposito"
                        ? m.Valor
                        : -m.Valor
                )) ?? 0m;

            return novoSaldoInicial
                + saldoTransacoes
                + recebidas
                - enviadas
                - reservado;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var carteiras = await ConsultarCarteiras(usuarioId.Value)
                .OrderBy(c => c.Id)
                .ToListAsync();

            return Ok(carteiras.Select(c => new
            {
                c.Id,
                c.Nome,
                c.Descricao,
                c.SaldoInicial,
                c.Arquivada,
                c.CriadaEm,
                c.SaldoAtual,
                c.SaldoReservado,
                SaldoDisponivel = c.SaldoAtual - c.SaldoReservado
            }));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var carteira = await ConsultarCarteiras(usuarioId.Value)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (carteira == null)
                return NotFound("Carteira não encontrada.");

            return Ok(new
            {
                carteira.Id,
                carteira.Nome,
                carteira.Descricao,
                carteira.SaldoInicial,
                carteira.Arquivada,
                carteira.CriadaEm,
                carteira.SaldoAtual,
                carteira.SaldoReservado,
                SaldoDisponivel =
                    carteira.SaldoAtual - carteira.SaldoReservado
            });
        }

        [HttpPost]
        public async Task<IActionResult> Criar(
            [FromBody] CarteiraRequest request)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Nome))
                return BadRequest("Informe o nome da carteira.");

            if (request.SaldoInicial < 0)
                return BadRequest("O saldo inicial não pode ser negativo.");

            var carteira = new Carteira
            {
                Nome = request.Nome.Trim(),
                Descricao = request.Descricao?.Trim() ?? "",
                SaldoInicial = request.SaldoInicial,
                UsuarioId = usuarioId.Value,
                CriadaEm = DateTime.UtcNow
            };

            _db.Carteiras.Add(carteira);
            await _db.SaveChangesAsync();

            return CreatedAtAction(
                nameof(Obter),
                new { id = carteira.Id },
                new
                {
                    carteira.Id,
                    carteira.Nome,
                    carteira.Descricao,
                    carteira.SaldoInicial,
                    carteira.Arquivada,
                    carteira.CriadaEm
                });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(
            int id,
            [FromBody] CarteiraRequest request)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Nome))
                return BadRequest("Informe o nome da carteira.");

            if (request.SaldoInicial < 0)
                return BadRequest("O saldo inicial não pode ser negativo.");

            await using var operacao = await _db.Database
                .BeginTransactionAsync();

            // Bloqueia a carteira durante a alteração.
            var carteira = await _db.Carteiras
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Carteiras""
                       WHERE ""Id"" = {id}
                         AND ""UsuarioId"" = {usuarioId.Value}
                       FOR UPDATE")
                .FirstOrDefaultAsync();

            if (carteira == null)
                return NotFound("Carteira não encontrada.");

            if (carteira.Arquivada)
                return BadRequest("Não é possível editar uma carteira arquivada.");

            var saldoDisponivel = await CalcularSaldoDisponivel(
                id,
                usuarioId.Value,
                request.SaldoInicial);

            if (saldoDisponivel < 0)
            {
                return BadRequest(
                    "O saldo inicial informado deixaria o saldo disponível negativo. " +
                    "Considere as transações, transferências e valores reservados nos cofrinhos."
                );
            }

            carteira.Nome = request.Nome.Trim();
            carteira.Descricao = request.Descricao?.Trim() ?? "";
            carteira.SaldoInicial = request.SaldoInicial;

            await _db.SaveChangesAsync();
            await operacao.CommitAsync();

            return Ok(carteira);
        }

        [HttpPatch("{id:int}/arquivar")]
        public async Task<IActionResult> Arquivar(int id)
        {
            return await AlterarArquivamento(id, true);
        }

        [HttpPatch("{id:int}/reativar")]
        public async Task<IActionResult> Reativar(int id)
        {
            return await AlterarArquivamento(id, false);
        }

        private async Task<IActionResult> AlterarArquivamento(
            int id,
            bool arquivada)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var carteira = await _db.Carteiras
                .FirstOrDefaultAsync(c =>
                    c.Id == id &&
                    c.UsuarioId == usuarioId.Value);

            if (carteira == null)
                return NotFound("Carteira não encontrada.");

            carteira.Arquivada = arquivada;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                carteira.Id,
                carteira.Nome,
                carteira.Arquivada
            });
        }

        private class CarteiraResumo
        {
            public int Id { get; set; }
            public string Nome { get; set; } = string.Empty;
            public string Descricao { get; set; } = string.Empty;
            public decimal SaldoInicial { get; set; }
            public bool Arquivada { get; set; }
            public DateTime CriadaEm { get; set; }
            public decimal SaldoAtual { get; set; }
            public decimal SaldoReservado { get; set; }
        }
    }

    public class CarteiraRequest
    {
        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descricao { get; set; }

        [Range(
            typeof(decimal),
            "0",
            "79228162514264337593543950335",
            ParseLimitsInInvariantCulture = true
        )]
        public decimal SaldoInicial { get; set; }
    }
}
