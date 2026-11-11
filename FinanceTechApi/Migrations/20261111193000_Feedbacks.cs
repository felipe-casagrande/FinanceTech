using FinanceTechApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
#nullable disable
namespace FinanceTechApi.Migrations;
[DbContext(typeof(AppDbContext))]
[Migration("20261111193000_Feedbacks")]
public partial class Feedbacks : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Feedbacks",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UsuarioId = table.Column<int>(type: "integer", nullable: false),
                Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                Mensagem = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Feedbacks", x => x.Id);
                table.ForeignKey("FK_Feedbacks_Usuarios_UsuarioId", x => x.UsuarioId, "Usuarios", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_Feedbacks_UsuarioId", table: "Feedbacks", column: "UsuarioId");
    }
    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "Feedbacks");
}
