using TournamentOrganizer.Api.Data;
using TournamentOrganizer.Api.Models;
using TournamentOrganizer.Api.Services;
using TournamentOrganizer.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace TournamentOrganizer.Tests;

/// <summary>
/// Hand-rolled in-memory tests for BadgeService — no Moq.
/// </summary>
public class BadgeServiceTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static AppDbContext BuildContext()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(opts);
    }

    private static Player MakePlayer(AppDbContext ctx, int placementGamesLeft = 0, int id = 0)
    {
        var p = new Player
        {
            Name               = "Test",
            Email              = $"test{id}@test.com",
            Mu                 = 25,
            Sigma              = 8.333,
            PlacementGamesLeft = placementGamesLeft,
            IsActive           = true,
        };
        ctx.Players.Add(p);
        ctx.SaveChanges();
        return p;
    }

    private static Event MakeEvent(AppDbContext ctx, int id = 0)
    {
        var e = new Event
        {
            Name   = $"Event{id}",
            Date   = DateTime.UtcNow,
            Status = EventStatus.Completed,
        };
        ctx.Events.Add(e);
        ctx.SaveChanges();
        return e;
    }

    private static GameResult MakeGameResult(AppDbContext ctx, int playerId, int gameId, int finishPosition)
    {
        var gr = new GameResult
        {
            PlayerId       = playerId,
            GameId         = gameId,
            FinishPosition = finishPosition,
        };
        ctx.GameResults.Add(gr);
        ctx.SaveChanges();
        return gr;
    }

    // Build a minimal Game → Pod → Round → Event chain and return the eventId
    private static int MakeGameInEvent(AppDbContext ctx, int playerId, int finishPosition)
    {
        var evt   = MakeEvent(ctx);
        var round = new Round { EventId = evt.Id, RoundNumber = 1 };
        ctx.Rounds.Add(round);
        ctx.SaveChanges();

        var pod = new Pod { RoundId = round.Id, PodNumber = 1 };
        ctx.Pods.Add(pod);
        ctx.SaveChanges();

        var game = new Game { PodId = pod.Id, Status = GameStatus.Completed };
        ctx.Games.Add(game);
        ctx.SaveChanges();

        MakeGameResult(ctx, playerId, game.Id, finishPosition);
        return evt.Id;
    }

    // ── tests ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CheckAndAward_FirstWin_AwardsBadge()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);
        var eventId = MakeGameInEvent(ctx, player.Id, finishPosition: 1);

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.GameResultRecorded, eventId);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.Contains(badges, b => b.BadgeKey == "first_win");
    }

    [Fact]
    public async Task CheckAndAward_FirstWin_AlreadyHasBadge_NoDuplicate()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);
        var eventId = MakeGameInEvent(ctx, player.Id, finishPosition: 1);

        // Pre-seed the badge
        ctx.PlayerBadges.Add(new PlayerBadge { PlayerId = player.Id, BadgeKey = "first_win", AwardedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.GameResultRecorded, eventId);

        var count = ctx.PlayerBadges.Count(b => b.PlayerId == player.Id && b.BadgeKey == "first_win");
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task CheckAndAward_PlacementComplete_AwardsBadge()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx, placementGamesLeft: 0);

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.PlacementComplete, null);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.Contains(badges, b => b.BadgeKey == "placement_complete");
    }

    [Fact]
    public async Task CheckAndAward_TournamentWinner_AwardsBadge()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);

        // Register player to event with rank 1 via standings (simulated via EventRegistration)
        var evt = MakeEvent(ctx);
        ctx.EventRegistrations.Add(new EventRegistration { EventId = evt.Id, PlayerId = player.Id });
        await ctx.SaveChangesAsync();

        // Build rounds with a win
        var round = new Round { EventId = evt.Id, RoundNumber = 1 };
        ctx.Rounds.Add(round);
        await ctx.SaveChangesAsync();
        var pod = new Pod { RoundId = round.Id, PodNumber = 1 };
        ctx.Pods.Add(pod);
        await ctx.SaveChangesAsync();
        var game = new Game { PodId = pod.Id, Status = GameStatus.Completed };
        ctx.Games.Add(game);
        await ctx.SaveChangesAsync();
        MakeGameResult(ctx, player.Id, game.Id, finishPosition: 1);

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.EventCompleted, evt.Id);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.Contains(badges, b => b.BadgeKey == "tournament_winner");
    }

    [Fact]
    public async Task CheckAndAward_Veteran_10Events_AwardsBadge()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);

        // Create 10 completed events and register the player
        for (int i = 0; i < 10; i++)
        {
            var evt = new Event { Name = $"E{i}", Date = DateTime.UtcNow, Status = EventStatus.Completed };
            ctx.Events.Add(evt);
            await ctx.SaveChangesAsync();
            ctx.EventRegistrations.Add(new EventRegistration { EventId = evt.Id, PlayerId = player.Id });
        }
        await ctx.SaveChangesAsync();

        var svc = new BadgeService(ctx);
        // Use the last event as trigger
        var lastEventId = ctx.Events.OrderByDescending(e => e.Id).First().Id;
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.EventCompleted, lastEventId);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.Contains(badges, b => b.BadgeKey == "veteran");
    }

    [Fact]
    public async Task CheckAndAward_Veteran_9Events_DoesNotAward()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);

        // Create 9 completed events
        for (int i = 0; i < 9; i++)
        {
            var evt = new Event { Name = $"E{i}", Date = DateTime.UtcNow, Status = EventStatus.Completed };
            ctx.Events.Add(evt);
            await ctx.SaveChangesAsync();
            ctx.EventRegistrations.Add(new EventRegistration { EventId = evt.Id, PlayerId = player.Id });
        }
        await ctx.SaveChangesAsync();

        var svc = new BadgeService(ctx);
        var lastEventId = ctx.Events.OrderByDescending(e => e.Id).First().Id;
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.EventCompleted, lastEventId);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.DoesNotContain(badges, b => b.BadgeKey == "veteran");
    }

    [Fact]
    public async Task CheckAndAward_UndefeatedSwiss_AllPodsWon_AwardsBadge()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);

        var evt = new Event { Name = "E", Date = DateTime.UtcNow, Status = EventStatus.Completed };
        ctx.Events.Add(evt);
        await ctx.SaveChangesAsync();
        ctx.EventRegistrations.Add(new EventRegistration { EventId = evt.Id, PlayerId = player.Id });
        await ctx.SaveChangesAsync();

        // 3 rounds, player wins all pods
        for (int r = 1; r <= 3; r++)
        {
            var round = new Round { EventId = evt.Id, RoundNumber = r };
            ctx.Rounds.Add(round);
            await ctx.SaveChangesAsync();
            var pod = new Pod { RoundId = round.Id, PodNumber = 1 };
            ctx.Pods.Add(pod);
            await ctx.SaveChangesAsync();
            var game = new Game { PodId = pod.Id, Status = GameStatus.Completed };
            ctx.Games.Add(game);
            await ctx.SaveChangesAsync();
            MakeGameResult(ctx, player.Id, game.Id, finishPosition: 1);
        }

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.EventCompleted, evt.Id);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.Contains(badges, b => b.BadgeKey == "undefeated_swiss");
    }

    [Fact]
    public async Task CheckAndAward_UndefeatedSwiss_OneNonWin_DoesNotAward()
    {
        await using var ctx = BuildContext();
        var player = MakePlayer(ctx);

        var evt = new Event { Name = "E", Date = DateTime.UtcNow, Status = EventStatus.Completed };
        ctx.Events.Add(evt);
        await ctx.SaveChangesAsync();
        ctx.EventRegistrations.Add(new EventRegistration { EventId = evt.Id, PlayerId = player.Id });
        await ctx.SaveChangesAsync();

        // Round 1: win
        {
            var round = new Round { EventId = evt.Id, RoundNumber = 1 };
            ctx.Rounds.Add(round);
            await ctx.SaveChangesAsync();
            var pod = new Pod { RoundId = round.Id, PodNumber = 1 };
            ctx.Pods.Add(pod);
            await ctx.SaveChangesAsync();
            var game = new Game { PodId = pod.Id, Status = GameStatus.Completed };
            ctx.Games.Add(game);
            await ctx.SaveChangesAsync();
            MakeGameResult(ctx, player.Id, game.Id, finishPosition: 1);
        }
        // Round 2: loss (finish 2nd)
        {
            var round = new Round { EventId = evt.Id, RoundNumber = 2 };
            ctx.Rounds.Add(round);
            await ctx.SaveChangesAsync();
            var pod = new Pod { RoundId = round.Id, PodNumber = 1 };
            ctx.Pods.Add(pod);
            await ctx.SaveChangesAsync();
            var game = new Game { PodId = pod.Id, Status = GameStatus.Completed };
            ctx.Games.Add(game);
            await ctx.SaveChangesAsync();
            MakeGameResult(ctx, player.Id, game.Id, finishPosition: 2);
        }

        var svc = new BadgeService(ctx);
        await svc.CheckAndAwardAsync(player.Id, BadgeTrigger.EventCompleted, evt.Id);

        var badges = ctx.PlayerBadges.Where(b => b.PlayerId == player.Id).ToList();
        Assert.DoesNotContain(badges, b => b.BadgeKey == "undefeated_swiss");
    }
}
