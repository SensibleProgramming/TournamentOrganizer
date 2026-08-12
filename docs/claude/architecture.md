### Backend (`src/TournamentOrganizer.Api/`)

Thin controllers → Services → Repositories → EF Core `AppDbContext`. Each layer has a matching interface under `*/Interfaces/`.

- **Controllers**: Route + HTTP shape only. Return DTOs, never domain models.
- **Services**: All business logic. `EventService`, `PlayerService`, `PodService`, `TrueSkillService`.
- **Repositories**: `PlayerRepository`, `EventRepository`, `GameRepository` — raw data access via EF Core.
- **DTOs** (`DTOs/`): Request and response shapes. `EventDto`, `PlayerDto`, `GameResultDto`, `StandingsDto`.
- **Models** (`Models/`): EF Core entities. `Player`, `Event`, `Round`, `Pod`, `PodPlayer`, `Game`, `GameResult`, `EventRegistration`.

All services and repositories are registered as `Scoped` in `Program.cs`.

**TrueSkill**: Custom implementation in `Services/TrueSkillCalculator.cs` (static) — do **not** add Moserware.Skills (incompatible with .NET 9). `TrueSkillService` wraps it and persists rating updates. Defaults: Mu=25.0, Sigma=8.333. `ConservativeScore = Mu - 3*Sigma` is computed, not stored.

**Player ranking lifecycle**: New players start with `PlacementGamesLeft = 5`. Each game result decrements it. `IsRanked` becomes true at 0. The leaderboard filters on `IsRanked`. Placement games still update TrueSkill.

**Pod seeding**:
- Round 1 — snake draft by `ConservativeScore` into balanced 4-player pods.
- Round 2+ — group by prior `FinishPosition`, sort by `ConservativeScore` within each group, form pods of 4 (allow one 3- or 5-player pod for remainders).

**Scoring**: 1st=4pts, 2nd=3pts, 3rd=2pts, 4th=1pt. Tiebreaker = average opponent `ConservativeScore`.

### Frontend (`tournament-client/`)

Angular 21, standalone components, Angular Material 21. State is managed via `BehaviorSubject` in feature services — no NgRx.

- **`core/services/api.service.ts`**: Single HTTP facade for all backend calls. All components go through this.
- **`core/models/api.models.ts`**: Shared TypeScript interfaces mirroring backend DTOs.
- **`features/`**: `events`, `leaderboard`, `player-profile`, `players`, `tournament` — each is a self-contained feature directory.
- **`shared/components/`**: Reusable `RatingBadgeComponent`, `PlacementBadgeComponent`, `PodTimerComponent`.

The Angular dev server proxies `/api/*` to `http://localhost:5021` via `proxy.conf.json`. The API allows CORS from `http://localhost:4200`.

### Testing

- **Backend**: xUnit in `src/TournamentOrganizer.Tests/`. Currently covers `TrueSkillCalculator`. Use `dotnet test`.
- **Frontend unit**: Jest via `jest-preset-angular`. Config in `tournament-client/jest.config.js`. Run with `npm test` from `tournament-client/`.
- **Frontend E2E**: Playwright in `tournament-client/e2e/`. Config in `tournament-client/playwright.config.ts`. Run with `/e2e` or `npm run e2e` from `tournament-client/`. Tests mock all API routes via `page.route()` — the .NET API does not need to be running.
- **rtk + Playwright**: the `rtk` hook wrapper's output parser only handles the default `list` reporter. Any other `--reporter` (`json`, custom, etc.) or ad-hoc debug output (e.g. `page.on('console'/'request')` listeners) can silently fail to parse. If you need structured/raw Playwright output, bypass rtk by calling the local binary directly: `node node_modules/@playwright/test/cli.js test <args>` from `tournament-client/`.
