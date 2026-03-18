using Microsoft.EntityFrameworkCore;
using TournamentOrganizer.Api.Data;
using TournamentOrganizer.Api.DTOs;
using TournamentOrganizer.Api.Models;
using TournamentOrganizer.Api.Services.Interfaces;

namespace TournamentOrganizer.Api.Services;

public class BadgeService : IBadgeService
{
    private static readonly Dictionary<string, string> BadgeDisplayNames = new()
    {
        ["first_win"]            = "First Win",
        ["placement_complete"]   = "Ranked",
        ["tournament_winner"]    = "Tournament Champion",
        ["undefeated_swiss"]     = "Flawless",
        ["veteran"]              = "Veteran",
        ["centurion"]            = "Centurion",
    };

    private readonly AppDbContext _ctx;

    public BadgeService(AppDbContext ctx) => _ctx = ctx;

    public async Task CheckAndAwardAsync(int playerId, BadgeTrigger trigger, int? eventId = null)
    {
        switch (trigger)
        {
            case BadgeTrigger.GameResultRecorded:
                await CheckFirstWinAsync(playerId, eventId);
                await CheckCenturionAsync(playerId, eventId);
                break;

            case BadgeTrigger.PlacementComplete:
                await AwardIfNewAsync(playerId, "placement_complete", eventId);
                break;

            case BadgeTrigger.EventCompleted:
                if (eventId.HasValue)
                {
                    await CheckTournamentWinnerAsync(playerId, eventId.Value);
                    await CheckUndefeatedSwissAsync(playerId, eventId.Value);
                    await CheckVeteranAsync(playerId, eventId.Value);
                }
                break;
        }
    }

    // ── badge checks ─────────────────────────────────────────────────────────

    private async Task CheckFirstWinAsync(int playerId, int? eventId)
    {
        // first_win: player has at least one FinishPosition == 1 in any completed game
        bool hasWin = await _ctx.GameResults
            .AnyAsync(gr => gr.PlayerId == playerId && gr.FinishPosition == 1);

        if (hasWin)
            await AwardIfNewAsync(playerId, "first_win", eventId);
    }

    private async Task CheckCenturionAsync(int playerId, int? eventId)
    {
        int gameCount = await _ctx.GameResults.CountAsync(gr => gr.PlayerId == playerId);
        if (gameCount >= 100)
            await AwardIfNewAsync(playerId, "centurion", eventId);
    }

    private async Task CheckTournamentWinnerAsync(int playerId, int eventId)
    {
        // Player wins event if they have the most 1st-place finishes (or ranked #1 overall).
        // We define it as: player finished 1st in every pod they played in this event, AND
        // had more wins than any other player, OR they simply had the highest total wins —
        // Simplified: player who has the most FinishPosition==1 across all pods in the event
        // (tie-break: first alphabetically is not ideal; use DB-level ordering).
        // Per spec intent: "Finish 1st overall in a completed event" = player ranks 1st in
        // the event standings. We derive it from pod results: most wins, then any tiebreak.

        var playerWins = await _ctx.GameResults
            .Include(gr => gr.Game)
                .ThenInclude(g => g.Pod)
                    .ThenInclude(p => p.Round)
            .Where(gr => gr.Game.Pod.Round.EventId == eventId && gr.FinishPosition == 1)
            .GroupBy(gr => gr.PlayerId)
            .Select(g => new { PlayerId = g.Key, Wins = g.Count() })
            .OrderByDescending(x => x.Wins)
            .ToListAsync();

        if (playerWins.Count == 0) return;

        // The player with the most wins in the event is the tournament winner.
        // If our player has the highest count (or tied for highest), award the badge.
        var topWins = playerWins[0].Wins;
        var topPlayers = playerWins.Where(x => x.Wins == topWins).Select(x => x.PlayerId).ToList();

        if (topPlayers.Contains(playerId))
            await AwardIfNewAsync(playerId, "tournament_winner", eventId);
    }

    private async Task CheckUndefeatedSwissAsync(int playerId, int eventId)
    {
        // All pods in the event that have results for this player must be FinishPosition == 1
        var results = await _ctx.GameResults
            .Include(gr => gr.Game)
                .ThenInclude(g => g.Pod)
                    .ThenInclude(p => p.Round)
            .Where(gr => gr.PlayerId == playerId && gr.Game.Pod.Round.EventId == eventId)
            .ToListAsync();

        if (results.Count == 0) return;

        bool allWins = results.All(gr => gr.FinishPosition == 1);
        if (allWins)
            await AwardIfNewAsync(playerId, "undefeated_swiss", eventId);
    }

    private async Task CheckVeteranAsync(int playerId, int eventId)
    {
        // Count all events the player has registered for (completed or otherwise)
        int eventCount = await _ctx.EventRegistrations
            .CountAsync(er => er.PlayerId == playerId);

        if (eventCount >= 10)
            await AwardIfNewAsync(playerId, "veteran", eventId);
    }

    public async Task<List<PlayerBadgeDto>> GetBadgesAsync(int playerId)
    {
        var badges = await _ctx.PlayerBadges
            .Where(b => b.PlayerId == playerId)
            .OrderBy(b => b.AwardedAt)
            .ToListAsync();

        return badges.Select(b => new PlayerBadgeDto(
            b.BadgeKey,
            BadgeDisplayNames.TryGetValue(b.BadgeKey, out var name) ? name : b.BadgeKey,
            b.AwardedAt,
            b.EventId
        )).ToList();
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private async Task AwardIfNewAsync(int playerId, string badgeKey, int? eventId)
    {
        bool exists = await _ctx.PlayerBadges
            .AnyAsync(b => b.PlayerId == playerId && b.BadgeKey == badgeKey);

        if (exists) return;

        _ctx.PlayerBadges.Add(new PlayerBadge
        {
            PlayerId  = playerId,
            BadgeKey  = badgeKey,
            AwardedAt = DateTime.UtcNow,
            EventId   = eventId,
        });
        await _ctx.SaveChangesAsync();
    }
}
