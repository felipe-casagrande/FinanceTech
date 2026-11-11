
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
    [Route("api/cofrinhos")]
    public class CofrinhosController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CofrinhosController(AppDbContext db)
        {
            _db = db;
        }

        private int? ObterUsuarioId()
        {
            var valor = User.FindFirstValue("sub")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(valor, out var id) ? id : null;
        }

        private IQueryable<CofrinhoResumo> ConsultarCofrinhos(int usuarioId)
        {
            return _db.Cofrinhos
                .AsNoTracking()
                .Where(c => c.UsuarioId == usuarioId)
                .Select(c => new CofrinhoResumo
                {
                    Id = c.Id,
                    Nome = c.Nome,
                    Descricao = c.Descricao,
                    ValorObjetivo = c.ValorObjetivo,
                    CarteiraId = c.CarteiraId,
                    Arquivado = c.Arquivado,
                    CriadoEm = c.CriadoEm,

                    Saldo = _db.MovimentacoesCofrinho
                        .Where(m =>
                            m.UsuarioId == usuarioId &&
                            m.CofrinhoId == c.Id)
                        .Sum(m => (decimal?)(
                            m.Tipo == "Deposito"
                                ? m.Valor
                                : -m.Valor
                        )) ?? 0m
                });
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var cofrinhos = await ConsultarCofrinhos(usuarioId.Value)
                .OrderBy(c => c.Id)
                .ToListAsync();

            return Ok(cofrinhos);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var cofrinho = await ConsultarCofrinhos(usuarioId.Value)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cofrinho == null)
                return NotFound("Cofrinho não encontrado.");

            return Ok(cofrinho);
        }

        [HttpPost]
        public async Task<IActionResult> Criar(
            [FromBody] CofrinhoRequest request)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Nome))
                return BadRequest("Informe o nome do cofrinho.");

            if (request.ValorObjetivo.HasValue &&
                request.ValorObjetivo.Value <= 0)
            {
                return BadRequest(
                    "O valor objetivo deve ser maior que zero."
                );
            }

            var carteira = await _db.Carteiras
                .AsNoTracking()
                .FirstOrDefaultAsync(c =>
                    c.Id == request.CarteiraId &&
                    c.UsuarioId == usuarioId.Value);

            if (carteira == null)
                return BadRequest("Carteira não encontrada.");

            if (carteira.Arquivada)
            {
                return BadRequest(
                    "Não é possível criar cofrinhos em uma carteira arquivada."
                );
            }

            var cofrinho = new Cofrinho
            {
                Nome = request.Nome.Trim(),
                Descricao = request.Descricao?.Trim() ?? "",
                ValorObjetivo = request.ValorObjetivo,
                UsuarioId = usuarioId.Value,
                CarteiraId = carteira.Id,
                CriadoEm = DateTime.UtcNow
            };

            _db.Cofrinhos.Add(cofrinho);
            await _db.SaveChangesAsync();

            return CreatedAtAction(
                nameof(Obter),
                new { id = cofrinho.Id },
                new
                {
                    cofrinho.Id,
                    cofrinho.Nome,
                    cofrinho.Descricao,
                    cofrinho.ValorObjetivo,
                    cofrinho.CarteiraId,
                    cofrinho.Arquivado,
                    cofrinho.CriadoEm,
                    Saldo = 0m
                });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(
            int id,
            [FromBody] CofrinhoAtualizarRequest request)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var cofrinho = await _db.Cofrinhos
                .FirstOrDefaultAsync(c =>
                    c.Id == id &&
                    c.UsuarioId == usuarioId.Value);

            if (cofrinho == null)
                return NotFound("Cofrinho não encontrado.");

            if (string.IsNullOrWhiteSpace(request.Nome))
                return BadRequest("Informe o nome do cofrinho.");

            if (request.ValorObjetivo.HasValue &&
                request.ValorObjetivo.Value <= 0)
            {
                return BadRequest(
                    "O valor objetivo deve ser maior que zero."
                );
            }

            cofrinho.Nome = request.Nome.Trim();
            cofrinho.Descricao = request.Descricao?.Trim() ?? "";
            cofrinho.ValorObjetivo = request.ValorObjetivo;

            await _db.SaveChangesAsync();

            return Ok(cofrinho);
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
            bool arquivado)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var cofrinho = await _db.Cofrinhos
                .FirstOrDefaultAsync(c =>
                    c.Id == id &&
                    c.UsuarioId == usuarioId.Value);

            if (cofrinho == null)
                return NotFound("Cofrinho não encontrado.");

            cofrinho.Arquivado = arquivado;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                cofrinho.Id,
                cofrinho.Nome,
                cofrinho.Arquivado
            });
        }

        [HttpGet("{id:int}/movimentacoes")]
        public async Task<IActionResult> ListarMovimentacoes(int id)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            var existe = await _db.Cofrinhos.AnyAsync(c =>
                c.Id == id &&
                c.UsuarioId == usuarioId.Value);

            if (!existe)
                return NotFound("Cofrinho não encontrado.");

            var movimentacoes = await _db.MovimentacoesCofrinho
                .AsNoTracking()
                .Where(m =>
                    m.CofrinhoId == id &&
                    m.UsuarioId == usuarioId.Value)
                .OrderByDescending(m => m.Data)
                .ThenByDescending(m => m.Id)
                .Select(m => new
                {
                    m.Id,
                    m.CofrinhoId,
                    m.Tipo,
                    m.Valor,
                    m.Descricao,
                    m.Data
                })
                .ToListAsync();

            return Ok(movimentacoes);
        }

        [HttpPost("{id:int}/depositar")]
        public async Task<IActionResult> Depositar(
            int id,
            [FromBody] MovimentarCofrinhoRequest request)
        {
            return await Movimentar(id, request, "Deposito");
        }

        [HttpPost("{id:int}/retirar")]
        public async Task<IActionResult> Retirar(
            int id,
            [FromBody] MovimentarCofrinhoRequest request)
        {
            return await Movimentar(id, request, "Retirada");
        }

        private async Task<IActionResult> Movimentar(
            int id,
            MovimentarCofrinhoRequest request,
            string tipo)
        {
            var usuarioId = ObterUsuarioId();

            if (usuarioId == null)
                return Unauthorized();

            if (request.Valor <= 0)
                return BadRequest("O valor deve ser maior que zero.");

            await using var transacao = await _db.Database
                .BeginTransactionAsync();

            var cofrinho = await _db.Cofrinhos
                .AsNoTracking()
                .FirstOrDefaultAsync(c =>
                    c.Id == id &&
                    c.UsuarioId == usuarioId.Value);

            if (cofrinho == null)
                return NotFound("Cofrinho não encontrado.");

            // Bloqueia a carteira durante a movimentação.
            var carteira = await _db.Carteiras
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Carteiras""
                       WHERE ""Id"" = {cofrinho.CarteiraId}
                         AND ""UsuarioId"" = {usuarioId.Value}
                       FOR UPDATE")
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (carteira == null)
                return BadRequest("Carteira não encontrada.");

            if (carteira.Arquivada)
                return BadRequest("A carteira está arquivada.");

            if (cofrinho.Arquivado)
                return BadRequest("O cofrinho está arquivado.");

            // Saldo atual do cofrinho.
            var saldoCofrinho = await _db.MovimentacoesCofrinho
                .Where(m =>
                    m.CofrinhoId == cofrinho.Id &&
                    m.UsuarioId == usuarioId.Value)
                .SumAsync(m => (decimal?)(
                    m.Tipo == "Deposito"
                        ? m.Valor
                        : -m.Valor
                )) ?? 0m;

            // Receitas e despesas da carteira.
            var saldoTransacoes = await _db.Transacoes
                .Where(t =>
                    t.CarteiraId == carteira.Id &&
                    t.UsuarioId == usuarioId.Value)
                .SumAsync(t => (decimal?)(
                    t.Tipo == "Receita"
                        ? t.Valor
                        : -t.Valor
                )) ?? 0m;

            // Transferências recebidas pela carteira.
            var transferenciasRecebidas =
                await _db.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId.Value &&
                        t.CarteiraDestinoId == carteira.Id)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            // Transferências enviadas pela carteira.
            var transferenciasEnviadas =
                await _db.TransferenciasCarteira
                    .Where(t =>
                        t.UsuarioId == usuarioId.Value &&
                        t.CarteiraOrigemId == carteira.Id)
                    .SumAsync(t => (decimal?)t.Valor) ?? 0m;

            // Saldo total considerando todas as operações.
            var saldoTotal = carteira.SaldoInicial
                + saldoTransacoes
                + transferenciasRecebidas
                - transferenciasEnviadas;

            // Total reservado em todos os cofrinhos da carteira.
            var reservadoCarteira = await _db.MovimentacoesCofrinho
                .Where(m =>
                    m.UsuarioId == usuarioId.Value &&
                    _db.Cofrinhos.Any(c =>
                        c.Id == m.CofrinhoId &&
                        c.UsuarioId == usuarioId.Value &&
                        c.CarteiraId == carteira.Id))
                .SumAsync(m => (decimal?)(
                    m.Tipo == "Deposito"
                        ? m.Valor
                        : -m.Valor
                )) ?? 0m;

            var saldoDisponivel = saldoTotal - reservadoCarteira;

            if (tipo == "Deposito" &&
                request.Valor > saldoDisponivel)
            {
                return BadRequest(
                    "Saldo disponível insuficiente na carteira."
                );
            }

            if (tipo == "Retirada" &&
                request.Valor > saldoCofrinho)
            {
                return BadRequest(
                    "Saldo insuficiente no cofrinho."
                );
            }

            var movimentacao = new MovimentacaoCofrinho
            {
                CofrinhoId = cofrinho.Id,
                UsuarioId = usuarioId.Value,
                Tipo = tipo,
                Valor = request.Valor,
                Descricao = request.Descricao?.Trim() ?? "",
                Data = DateTime.UtcNow
            };

            _db.MovimentacoesCofrinho.Add(movimentacao);
            await _db.SaveChangesAsync();

            await transacao.CommitAsync();

            var novoSaldoCofrinho = tipo == "Deposito"
                ? saldoCofrinho + request.Valor
                : saldoCofrinho - request.Valor;

            var novoReservadoCarteira = tipo == "Deposito"
                ? reservadoCarteira + request.Valor
                : reservadoCarteira - request.Valor;

            return Ok(new
            {
                movimentacao.Id,
                movimentacao.CofrinhoId,
                movimentacao.Tipo,
                movimentacao.Valor,
                movimentacao.Descricao,
                movimentacao.Data,
                SaldoCofrinho = novoSaldoCofrinho,
                SaldoTotalCarteira = saldoTotal,
                SaldoReservadoCarteira = novoReservadoCarteira,
                SaldoDisponivelCarteira =
                    saldoTotal - novoReservadoCarteira
            });
        }

        private class CofrinhoResumo
        {
            public int Id { get; set; }
            public string Nome { get; set; } = string.Empty;
            public string Descricao { get; set; } = string.Empty;
            public decimal? ValorObjetivo { get; set; }
            public int CarteiraId { get; set; }
            public bool Arquivado { get; set; }
            public DateTime CriadoEm { get; set; }
            public decimal Saldo { get; set; }
        }
    }

    public class CofrinhoRequest
    {
        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descricao { get; set; }

        public decimal? ValorObjetivo { get; set; }

        [Range(1, int.MaxValue)]
        public int CarteiraId { get; set; }
    }

    public class CofrinhoAtualizarRequest
    {
        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descricao { get; set; }

        public decimal? ValorObjetivo { get; set; }
    }

    public class MovimentarCofrinhoRequest
    {
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
