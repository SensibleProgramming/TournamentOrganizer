using TournamentOrganizer.Api.DTOs;
using TournamentOrganizer.Api.Models;

namespace TournamentOrganizer.Api.Services.Interfaces;

public interface IPlayerService
{
    Task<PlayerDto> RegisterAsync(CreatePlayerDto dto);
    Task<PlayerDto?> UpdateAsync(int id, UpdatePlayerDto dto);
    Task<PlayerProfileDto?> GetProfileAsync(int id);
    Task<List<PlayerDto>> GetAllAsync();
    Task<List<LeaderboardEntryDto>> GetLeaderboardAsync();
    Task<List<HeadToHeadEntryDto>?> GetHeadToHeadAsync(int playerId);
    Task<PlayerCommanderStatsDto?> GetCommanderStatsAsync(int playerId);
    Task<Player?> GetByIdAsync(int id);
    Task<PlayerDto> UpdateAvatarUrlAsync(int playerId, string? avatarUrl);
    Task<bool> IsPlayerAtStoreAsync(int playerId, int storeId);
    Task<bool> IsPlayerEmailAsync(int playerId, string? email);
}
