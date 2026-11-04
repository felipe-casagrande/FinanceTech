using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinanceTechApi.Data;
using FinanceTechApi.DTOs;
using FinanceTechApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace FinanceTechApi.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPasswordHasher<Usuario> _passwordHasher;
        private readonly IConfiguration _configuration;

        public AuthController(
            AppDbContext context,
            IPasswordHasher<Usuario> passwordHasher,
            IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
        }

        [HttpPost("cadastro")]
        public async Task<IActionResult> Cadastro(CadastroDTO dto)
        {
            string email = dto.Email.Trim().ToLower();

            bool emailExiste = await _context.Usuarios
                .AnyAsync(u => u.Email == email);

            if (emailExiste)
            {
                return BadRequest(new
                {
                    mensagem = "Este e-mail já está cadastrado."
                });
            }

            var usuario = new Usuario
            {
                Nome = dto.Nome.Trim(),
                Email = email
            };

            usuario.SenhaHash = _passwordHasher.HashPassword(
                usuario,
                dto.Senha
            );

            _context.Usuarios.Add(usuario);

            await _context.SaveChangesAsync();

            return Ok(CriarResposta(usuario));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            string email = dto.Email.Trim().ToLower();

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email == email);

            if (usuario == null)
            {
                return Unauthorized(new
                {
                    mensagem = "E-mail ou senha incorretos."
                });
            }

            var resultado = _passwordHasher.VerifyHashedPassword(
                usuario,
                usuario.SenhaHash,
                dto.Senha
            );

            if (resultado == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new
                {
                    mensagem = "E-mail ou senha incorretos."
                });
            }

            return Ok(CriarResposta(usuario));
        }

        private object CriarResposta(Usuario usuario)
        {
            string chave = _configuration["Jwt:Key"]!;

            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(chave)
            );

            var credentials = new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256
            );

            var claims = new[]
            {
                new Claim(
                    JwtRegisteredClaimNames.Sub,
                    usuario.Id.ToString()
                ),

                new Claim(
                    JwtRegisteredClaimNames.Email,
                    usuario.Email
                ),

                new Claim("nome", usuario.Nome)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),

                usuario = new
                {
                    usuario.Id,
                    usuario.Nome,
                    usuario.Email
                }
            };
        }
    }
}