using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FinanceTechApi.Migrations
{
    /// <inheritdoc />
    public partial class TransferenciasEntreCarteiras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TransferenciasCarteira",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    CarteiraOrigemId = table.Column<int>(type: "integer", nullable: false),
                    CarteiraDestinoId = table.Column<int>(type: "integer", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Data = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransferenciasCarteira", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransferenciasCarteira_Carteiras_CarteiraDestinoId",
                        column: x => x.CarteiraDestinoId,
                        principalTable: "Carteiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransferenciasCarteira_Carteiras_CarteiraOrigemId",
                        column: x => x.CarteiraOrigemId,
                        principalTable: "Carteiras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransferenciasCarteira_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransferenciasCarteira_CarteiraDestinoId",
                table: "TransferenciasCarteira",
                column: "CarteiraDestinoId");

            migrationBuilder.CreateIndex(
                name: "IX_TransferenciasCarteira_CarteiraOrigemId",
                table: "TransferenciasCarteira",
                column: "CarteiraOrigemId");

            migrationBuilder.CreateIndex(
                name: "IX_TransferenciasCarteira_UsuarioId_CarteiraDestinoId",
                table: "TransferenciasCarteira",
                columns: new[] { "UsuarioId", "CarteiraDestinoId" });

            migrationBuilder.CreateIndex(
                name: "IX_TransferenciasCarteira_UsuarioId_CarteiraOrigemId",
                table: "TransferenciasCarteira",
                columns: new[] { "UsuarioId", "CarteiraOrigemId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransferenciasCarteira");
        }
    }
}
