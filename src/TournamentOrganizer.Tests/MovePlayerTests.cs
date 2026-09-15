using TournamentOrganizer.Api.DTOs;
using TournamentOrganizer.Api.Models;
using TournamentOrganizer.Api.Repositories.Interfaces;
using TournamentOrganizer.Api.Services;
using TournamentOrganizer.Api.Services.Interfaces;

namespace TournamentOrganizer.Tests;

public class MovePlayerTests
{
    // ── Fake EventRepository ──────────────────────────────────────────────

    private sealed class FakeEventRepository : IEventRepository
    {
        public Dictionary<int, Pod> Pods { get; } = [];
        public List<PodPlayer> UpdatedPodPlayers { get; private set; } = [];

        public Task<Pod?> GetPodWithPlayersAsync(int podId) =>
            Task.FromResult(Pods.GetValueOrDefault(podId));

        public Task UpdatePodPlayersAsync(IEnumerable<PodPlayer> podPlayers)
        {
            UpdatedPodPlayers = podPlayers.ToList();
            return Task.CompletedTask;
        }

        // ── Unused stubs ──────────────────────────────────────────────────
        public Task<Event?> GetByIdAsync(int id)                              => throw new NotImplementedException();
        public Task<Event?> GetWithDetailsAsync(int id)                       => throw new NotImplementedException();
        public Task<List<Event>> GetAllAsync()                                => throw new NotImplementedException();
        public Task<List<Event>> GetAllWithStoreAsync(int? storeId = null)    => throw new NotImplementedException();
        public Task<Event> CreateAsync(Event evt)                            => throw new NotImplementedException();
        public Task UpdateAsync(Event evt)                                   => throw new NotImplementedException();
        public Task<EventRegistration> RegisterPlayerAsync(EventRegistration r) => throw new NotImplementedException();
        public Task<List<Player>> GetRegisteredPlayersAsync(int eventId)     => throw new NotImplementedException();
        public Task<bool> IsPlayerRegisteredAsync(int eid, int pid)          => throw new NotImplementedException();
        public Task<Round> CreateRoundAsync(Round round)                     => throw new NotImplementedException();
        public Task<Round?> GetLatestRoundAsync(int eventId)                 => throw new NotImplementedException();
        public Task<Round?> GetLatestRoundWithPairingsAsync(int eventId)     => throw new NotImplementedException();
        public Task<Round?> GetRoundWithDetailsAsync(int roundId)            => throw new NotImplementedException();
        public Task<List<Round>> GetRoundsForEventAsync(int eventId)         => throw new NotImplementedException();
        public Task<EventRegistration?> GetRegistrationAsync(int eid, int pid) => throw new NotImplementedException();
        public Task<List<EventRegistration>> GetRegistrationsWithPlayersAsync(int eventId) => throw new NotImplementedException();
        public Task RemoveRegistrationAsync(EventRegistration r)             => throw new NotImplementedException();
        public Task UpdateRegistrationAsync(EventRegistration r)             => throw new NotImplementedException();
        public Task<Event?> GetByCheckInTokenAsync(string token)             => throw new NotImplementedException();
    }

    // ── Stubs ─────────────────────────────────────────────────────────────

    private sealed class StubPlayerRepository : IPlayerRepository
    {
        public Task<Player?> GetByIdAsync(int id)                                => throw new NotImplementedException();
        public Task<Player?> GetByEmailAsync(string e)                          => throw new NotImplementedException();
        public Task<List<Player>> GetLeaderboardAsync()                         => throw new NotImplementedException();
        public Task<List<Player>> GetAllAsync()                                 => throw new NotImplementedException();
        public Task<Player> CreateAsync(Player p)                               => throw new NotImplementedException();
        public Task UpdateAsync(Player p)                                       => throw new NotImplementedException();
        public Task UpdateRangeAsync(IEnumerable<Player> ps)                   => throw new NotImplementedException();
        public Task<List<Player>> GetByIdsAsync(IEnumerable<int> ids)         => throw new NotImplementedException();
        public Task<List<EventRegistration>> GetPlayerEventRegistrationsAsync(int pid) => throw new NotImplementedException();
    }

    private sealed class StubGameRepository : IGameRepository
    {
        public Task<Game?> GetByIdAsync(int id)                            => throw new NotImplementedException();
        public Task<Game?> GetWithResultsAsync(int id)                     => throw new NotImplementedException();
        public Task<Game> CreateAsync(Game g)                              => throw new NotImplementedException();
        public Task UpdateAsync(Game g)                                    => throw new NotImplementedException();
        public Task AddResultsAsync(IEnumerable<GameResult> r)            => throw new NotImplementedException();
        public Task DeleteResultsAsync(int gameId)                        => throw new NotImplementedException();
        public Task<List<GameResult>> GetPlayerResultsAsync(int pid)      => throw new NotImplementedException();
        public Task<List<GameResult>> GetPlayerGamesWithOpponentsAsync(int pid) => throw new NotImplementedException();
        public Task<List<int>> GetPreviousOpponentIdsAsync(int eid, int pid) => throw new NotImplementedException();
        public Task<List<GameResult>> GetStoreGameResultsAsync(int storeId, DateTime? since) => throw new NotImplementedException();
        public Task<List<GameResult>> GetPlayerGamesForRatingReplayAsync(int pid) => throw new NotImplementedException();
    }

    private sealed class StubPodService : IPodService
    {
        public List<List<Player>> GenerateRound1Pods(List<Player> players) => throw new NotImplementedException();
        public List<List<Player>> GenerateNextRoundPods(Round prev, List<Player> active) => throw new NotImplementedException();
    }

    private sealed class StubTrueSkillService : ITrueSkillService
    {
        public Task UpdateRatingsAsync(Game game) => throw new NotImplementedException();
        public Task UpdateRatingsFromEventStandingsAsync(List<(int PlayerId, int Rank, int GamesPlayed)> rankings) => throw new NotImplementedException();
    }

    private sealed class StubDiscordWebhookService : IDiscordWebhookService
    {
        public Task PostRoundResultsAsync(int eventId, int roundNumber) => throw new NotImplementedException();
        public Task PostEventCompletedAsync(int eventId) => throw new NotImplementedException();
        public Task PostPlayerRankedAsync(int playerId, int eventId) => throw new NotImplementedException();
        public Task PostTestMessageAsync(int storeId) => throw new NotImplementedException();
    }

    private sealed class StubBadgeService : IBadgeService
    {
        public Task CheckAndAwardAsync(int playerId, BadgeTrigger trigger, int? eventId = null) => throw new NotImplementedException();
        public Task<List<PlayerBadgeDto>> GetBadgesAsync(int playerId) => throw new NotImplementedException();
    }

    private sealed class StubStoreEventRepository : IStoreEventRepository
    {
        public Task AddAsync(StoreEvent se) => throw new NotImplementedException();
        public Task<int?> GetStoreIdForEventAsync(int eventId) => throw new NotImplementedException();
        public Task<(int? StoreId, string? StoreName, string? StoreBackgroundImageUrl)> GetStoreInfoForEventAsync(int eventId) => throw new NotImplementedException();
        public Task<List<StoreEvent>> GetByStoreIdAsync(int storeId) => throw new NotImplementedException();
    }

    private sealed class StubLicenseTierService : ILicenseTierService
    {
        public Task<LicenseTier> GetEffectiveTierAsync(int storeId) => throw new NotImplementedException();
        public Task<(bool IsInTrial, DateTime? TrialExpiresDate)> GetTrialStatusAsync(int storeId) => throw new NotImplementedException();
        public Task<(bool IsInGracePeriod, DateTime? GracePeriodEndsDate)> GetGracePeriodStatusAsync(int storeId) => throw new NotImplementedException();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static EventService BuildService(FakeEventRepository eventRepo) =>
        new(eventRepo, new StubPlayerRepository(), new StubGameRepository(),
            new StubPodService(), new StubTrueSkillService(), new StubStoreEventRepository(),
            new StubDiscordWebhookService(), new StubBadgeService(), new StubLicenseTierService());

    private static Player MakePlayer(int id, string name) => new()
        { Id = id, Name = name, Email = $"p{id}@test.com", Mu = 25, Sigma = 8.333 };

    private static Pod MakePod(int id, int roundId, GameStatus status, int playerCount, int startPlayerId = 1)
    {
        var pod = new Pod { Id = id, RoundId = roundId, PodNumber = id };
        pod.Game = new Game { Id = id, PodId = id, Status = status, Pod = pod };
        pod.PodPlayers = Enumerable.Range(0, playerCount).Select(i =>
        {
            var player = MakePlayer(startPlayerId + i, $"Player{startPlayerId + i}");
            return new PodPlayer { Id = id * 100 + i, PodId = id, PlayerId = player.Id, Player = player, SeatOrder = i + 1, Pod = pod };
        }).ToList();
        return pod;
    }

    // ── Tests ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task MovePlayerAsync_HappyPath_MovesPlayerAndRenumbersSeats()
    {
        var eventRepo = new FakeEventRepository();
        var source = MakePod(1, roundId: 1, GameStatus.Pending, playerCount: 4, startPlayerId: 1);
        var target = MakePod(2, roundId: 1, GameStatus.Pending, playerCount: 4, startPlayerId: 5);
        eventRepo.Pods[1] = source;
        eventRepo.Pods[2] = target;

        var svc = BuildService(eventRepo);
        var movingPlayerId = source.PodPlayers.First().PlayerId; // player 1, seat 1

        var result = await svc.MovePlayerAsync(sourcePodId: 1, playerId: movingPlayerId, targetPodId: 2);

        Assert.Equal(3, result.SourcePod.Players.Count);
        Assert.Equal(5, result.TargetPod.Players.Count);
        Assert.DoesNotContain(result.SourcePod.Players, p => p.PlayerId == movingPlayerId);
        Assert.Contains(result.TargetPod.Players, p => p.PlayerId == movingPlayerId);

        // Seats renumbered contiguously 1..N on both sides
        Assert.Equal(new[] { 1, 2, 3 }, result.SourcePod.Players.Select(p => p.SeatOrder).OrderBy(s => s));
        Assert.Equal(new[] { 1, 2, 3, 4, 5 }, result.TargetPod.Players.Select(p => p.SeatOrder).OrderBy(s => s));

        var movedInTarget = result.TargetPod.Players.First(p => p.PlayerId == movingPlayerId);
        Assert.Equal(5, movedInTarget.SeatOrder);
    }

    [Fact]
    public async Task MovePlayerAsync_MovingOutOf4PodIntoAnother4Pod_Allowed()
    {
        var eventRepo = new FakeEventRepository();
        var source = MakePod(1, roundId: 1, GameStatus.Pending, playerCount: 4, startPlayerId: 1);
        var target = MakePod(2, roundId: 1, GameStatus.Pending, playerCount: 4, startPlayerId: 5);
        eventRepo.Pods[1] = source;
        eventRepo.Pods[2] = target;
        var svc = BuildService(eventRepo);

        var result = await svc.MovePlayerAsync(1, source.PodPlayers.First().PlayerId, 2);

        Assert.Equal(3, result.SourcePod.Players.Count);
        Assert.Equal(5, result.TargetPod.Players.Count);
    }

    [Fact]
    public async Task MovePlayerAsync_SourcePodNotFound_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[2] = MakePod(2, 1, GameStatus.Pending, 4, 5);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 5, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_TargetPodNotFound_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[1] = MakePod(1, 1, GameStatus.Pending, 4, 1);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 1, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_SamePod_Throws()
    {
        var eventRepo = new FakeEventRepository();
        var pod = MakePod(1, 1, GameStatus.Pending, 4, 1);
        eventRepo.Pods[1] = pod;
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 1, 1));
    }

    [Fact]
    public async Task MovePlayerAsync_DifferentRounds_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[1] = MakePod(1, roundId: 1, GameStatus.Pending, 4, 1);
        eventRepo.Pods[2] = MakePod(2, roundId: 2, GameStatus.Pending, 4, 5);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 1, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_SourceGameCompleted_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[1] = MakePod(1, 1, GameStatus.Completed, 4, 1);
        eventRepo.Pods[2] = MakePod(2, 1, GameStatus.Pending, 4, 5);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 1, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_TargetGameCompleted_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[1] = MakePod(1, 1, GameStatus.Pending, 4, 1);
        eventRepo.Pods[2] = MakePod(2, 1, GameStatus.Completed, 4, 5);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 1, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_PlayerNotInSourcePod_Throws()
    {
        var eventRepo = new FakeEventRepository();
        eventRepo.Pods[1] = MakePod(1, 1, GameStatus.Pending, 4, 1);
        eventRepo.Pods[2] = MakePod(2, 1, GameStatus.Pending, 4, 5);
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.MovePlayerAsync(1, 999, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_PlayerAlreadyInTargetPod_Throws()
    {
        var eventRepo = new FakeEventRepository();
        var source = MakePod(1, 1, GameStatus.Pending, 4, 1);
        var target = MakePod(2, 1, GameStatus.Pending, 4, 1); // overlapping player ids 1-4
        eventRepo.Pods[1] = source;
        eventRepo.Pods[2] = target;
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.MovePlayerAsync(1, source.PodPlayers.First().PlayerId, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_SourceWouldDropBelow3_Throws()
    {
        var eventRepo = new FakeEventRepository();
        var source = MakePod(1, 1, GameStatus.Pending, playerCount: 3, startPlayerId: 1);
        var target = MakePod(2, 1, GameStatus.Pending, playerCount: 4, startPlayerId: 10);
        eventRepo.Pods[1] = source;
        eventRepo.Pods[2] = target;
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.MovePlayerAsync(1, source.PodPlayers.First().PlayerId, 2));
    }

    [Fact]
    public async Task MovePlayerAsync_TargetWouldExceed5_Throws()
    {
        var eventRepo = new FakeEventRepository();
        var source = MakePod(1, 1, GameStatus.Pending, playerCount: 4, startPlayerId: 1);
        var target = MakePod(2, 1, GameStatus.Pending, playerCount: 5, startPlayerId: 10);
        eventRepo.Pods[1] = source;
        eventRepo.Pods[2] = target;
        var svc = BuildService(eventRepo);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.MovePlayerAsync(1, source.PodPlayers.First().PlayerId, 2));
    }
}
