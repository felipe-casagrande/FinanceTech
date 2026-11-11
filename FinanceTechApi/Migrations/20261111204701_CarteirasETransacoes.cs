
using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FinanceTechApi.Migrations
{
    public partial class CarteirasETransacoes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transacoes_UsuarioId",
                table: "Transacoes");

            migrationBuilder.AddColumn<int>(
                name: "CarteiraId",
                table: "Transacoes",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Carteiras",
                columns: table => new
                {
                    Id = table.Column<int>(
                        type: "integer",
                        nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),

                    Nome = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false),

                    Descricao = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: false),

                    UsuarioId = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    SaldoInicial = table.Column<decimal>(
                        type: "numeric(18,2)",
                        precision: 18,
                        scale: 2,
                        nullable: false),

                    Arquivada = table.Column<bool>(
                        type: "boolean",
                        nullable: false),

                    CriadaEm = table.Column<DateTime>(
                        type: "timestamp without time zone",
                        nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carteiras", x => x.Id);

                    table.ForeignKey(
                        name: "FK_Carteiras_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Cria uma carteira Principal para cada usuário existente
            migrationBuilder.Sql(@"
                INSERT INTO ""Carteiras""
                    (""Nome"", ""Descricao"", ""UsuarioId"",
                     ""SaldoInicial"", ""Arquivada"", ""CriadaEm"")
                SELECT
                    'Principal',
                    'Carteira principal do FinanceTech',
                    u.""Id"",
                    0,
                    FALSE,
                    NOW()::timestamp
                FROM ""Usuarios"" u
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM ""Carteiras"" c
                    WHERE c.""UsuarioId"" = u.""Id""
                      AND c.""Nome"" = 'Principal'
                );
            ");

            // Associa as transações antigas à carteira Principal
            migrationBuilder.Sql(@"
                UPDATE ""Transacoes"" t
                SET ""CarteiraId"" = c.""Id""
                FROM ""Carteiras"" c
                WHERE t.""UsuarioId"" = c.""UsuarioId""
                  AND c.""Nome"" = 'Principal'
                  AND t.""CarteiraId"" IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Transacoes_CarteiraId",
                table: "Transacoes",
                column: "CarteiraId");

            migrationBuilder.CreateIndex(
                name: "IX_Transacoes_UsuarioId_CarteiraId",
                table: "Transacoes",
                columns: new[] { "UsuarioId", "CarteiraId" });

            migrationBuilder.CreateIndex(
                name: "IX_Carteiras_UsuarioId",
                table: "Carteiras",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transacoes_Carteiras_CarteiraId",
                table: "Transacoes",
                column: "CarteiraId",
                principalTable: "Carteiras",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transacoes_Carteiras_CarteiraId",
                table: "Transacoes");

            migrationBuilder.DropTable(
                name: "Carteiras");

            migrationBuilder.DropIndex(
                name: "IX_Transacoes_CarteiraId",
                table: "Transacoes");

            migrationBuilder.DropIndex(
                name: "IX_Transacoes_UsuarioId_CarteiraId",
                table: "Transacoes");

            migrationBuilder.DropColumn(
                name: "CarteiraId",
                table: "Transacoes");

            migrationBuilder.CreateIndex(
                name: "IX_Transacoes_UsuarioId",
                table: "Transacoes",
                column: "UsuarioId");
        }
    }
}
