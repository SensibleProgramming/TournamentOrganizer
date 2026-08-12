## Raw Commands

Slash-command skills are listed in the session context. Raw equivalents:

### Backend (run from repo root)
```bash
dotnet build
dotnet run --project src/TournamentOrganizer.Api/
dotnet test                                # xUnit tests in TournamentOrganizer.Tests
dotnet test --filter "FullyQualifiedName~TrueSkillCalculatorTests"  # single test class
```

### Frontend (run from `tournament-client/`)
```bash
npm start                    # dev server at http://localhost:4200
npm run build                # production build
npm test                     # Jest (jest-preset-angular)
npm test -- --testPathPattern=event-list  # single test file
```

### EF Core Migrations
```bash
dotnet ef migrations add <Name> --project src/TournamentOrganizer.Api/
dotnet ef database update --project src/TournamentOrganizer.Api/
```

## TDD Mechanics per Stack

### Backend TDD
- Add xUnit tests in `src/TournamentOrganizer.Tests/` before touching service/controller code.
- Use `dotnet test` to run; `dotnet test --filter "FullyQualifiedName~<TestClass>"` for a single class.

### Frontend TDD
- Add Jest specs (`.spec.ts`) alongside the component/service file before touching implementation.
- Use `npm test -- --testPathPattern=<filename>` from `tournament-client/` to run a single spec.
- Mock `ApiService` and `HttpClient` with Jest spies — do not make real HTTP calls in tests.

### Frontend E2E (Playwright)
- E2E specs live in `tournament-client/e2e/` organised by feature (e.g. `e2e/stores/`).
- Use `loginAs(page, role)` from `e2e/helpers/auth.ts` to inject a fake JWT — do not attempt real OAuth in tests.
- Mock all API calls with `page.route()` helpers from `e2e/helpers/api-mock.ts` — the backend does not need to be running.
