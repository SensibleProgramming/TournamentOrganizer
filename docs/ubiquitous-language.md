# Ubiquitous Language — TournamentOrganizer

> Terms used in code, docs, and conversation for this project.
> Shared cross-project terms are noted with → Brain/Glossary.

## Terms

**Commander** — The legendary creature chosen by a player as the starting card for their EDH/Commander format deck; also tracked in game results to analyze meta trends.

**Conservative Score** — A skill metric derived from a player's TrueSkill rating (Mu - 3 × Sigma) that represents the lower bound of their estimated strength, used for seeding and ranking display.

**Event** — A single Magic: The Gathering tournament instance with a name, date, status, point system, and maximum player capacity; progresses through Registration → InProgress → Completed lifecycle.

**Finish Position** — A player's placement in a game (1 = winner, 4 = last place in a 4-player pod), used to calculate TrueSkill updates and tournament standings.

**Format** → Brain/Glossary — A Magic tournament variant with specific rules, format options, and scoring system (e.g., Standard, Modern, Commander).

**Game** — A single multiplayer Magic match within a pod, containing 3–5 players and their individual finish positions and eliminations.

**Game Result** — A record capturing one player's outcome in a game, including finish position, eliminations, turns survived, commander played, and deck colors.

**Leaderboard** — A global ranking of players sorted by conservative score, filtered to show only ranked players (those with zero placement games remaining).

**Match** — (See "Pod" - in this system, a pod represents the match structure for multiplayer Magic).

**Placement Games** — The first 5 games a new player must complete before becoming ranked; placement games still update TrueSkill but the player does not appear on the leaderboard until all are complete.

**Pod** — A group of 3–5 players (typically 4) assigned to play a single game together in a tournament round, seeded to balance skill levels.

**Ranking** — The system that calculates and displays player skill (TrueSkill-based), enabling seeded pod assignments and leaderboard display.

**Result** — (See "Game Result").

**Round** — A numbered phase in a tournament during which all players play one game in parallel pods; multiple rounds occur sequentially within an event.

**Tournament** — (See "Event").

**TrueSkill** — A Bayesian skill rating algorithm tracking player strength via two parameters (Mu = mean, Sigma = standard deviation); updated after each game result.
