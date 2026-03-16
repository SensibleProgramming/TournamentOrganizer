using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TournamentOrganizer.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarUrlToPlayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Players",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "Players");
        }
    }
}
