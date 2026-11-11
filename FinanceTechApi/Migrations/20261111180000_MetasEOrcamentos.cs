using FinanceTechApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace FinanceTechApi.Migrations;
[DbContext(typeof(AppDbContext))]
[Migration("20261111180000_MetasEOrcamentos")]
public partial class MetasEOrcamentos : Migration {
 protected override void Up(MigrationBuilder migrationBuilder) {
  migrationBuilder.CreateTable(name:"MetasFinanceiras", columns: table => new {
   Id = table.Column<int>(type:"integer", nullable:false).Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
   UsuarioId = table.Column<int>(type:"integer",nullable:false),
   Nome = table.Column<string>(type:"character varying(100)",maxLength:100,nullable:false),
   ValorAlvo = table.Column<decimal>(type:"numeric",nullable:false),
   ValorAtual = table.Column<decimal>(type:"numeric",nullable:false),
   Prazo = table.Column<DateOnly>(type:"date",nullable:true)
  }, constraints: table => { table.PrimaryKey("PK_MetasFinanceiras",x=>x.Id); table.ForeignKey("FK_MetasFinanceiras_Usuarios_UsuarioId",x=>x.UsuarioId,"Usuarios","Id",onDelete:ReferentialAction.Cascade); });
  migrationBuilder.CreateIndex(name:"IX_MetasFinanceiras_UsuarioId",table:"MetasFinanceiras",column:"UsuarioId");
  migrationBuilder.CreateTable(name:"OrcamentosMensais", columns: table => new {
   Id = table.Column<int>(type:"integer", nullable:false).Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
   UsuarioId = table.Column<int>(type:"integer",nullable:false),
   Categoria = table.Column<string>(type:"character varying(80)",maxLength:80,nullable:false),
   Mes = table.Column<string>(type:"character varying(7)",maxLength:7,nullable:false),
   Limite = table.Column<decimal>(type:"numeric",nullable:false)
  }, constraints: table => { table.PrimaryKey("PK_OrcamentosMensais",x=>x.Id); table.ForeignKey("FK_OrcamentosMensais_Usuarios_UsuarioId",x=>x.UsuarioId,"Usuarios","Id",onDelete:ReferentialAction.Cascade); });
  migrationBuilder.CreateIndex(name:"IX_OrcamentosMensais_UsuarioId_Categoria_Mes",table:"OrcamentosMensais",columns:new[]{"UsuarioId","Categoria","Mes"},unique:true);
 }
 protected override void Down(MigrationBuilder migrationBuilder) { migrationBuilder.DropTable(name:"MetasFinanceiras"); migrationBuilder.DropTable(name:"OrcamentosMensais"); }
}
