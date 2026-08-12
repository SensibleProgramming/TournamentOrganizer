## Purpose

Defines which action buttons the events/<id> status-actions panel shows for a given event and round state, so the UI never offers an action that would be meaningless in the current tournament state.

## ADDED Requirements

### Requirement: Pause action hidden once all rounds are complete
The system SHALL hide the Pause action for an in-progress event once the event has completed all its planned rounds, since there is nothing left to pause. End Event SHALL remain available in this state.

#### Scenario: All planned rounds complete
- **WHEN** an event is InProgress, `plannedRounds` is set, the number of generated rounds has reached `plannedRounds`, and every pod in the last round has a submitted result
- **THEN** the status-actions panel does not show the Pause button
- **AND** the End Event button remains visible

#### Scenario: Rounds remaining
- **WHEN** an event is InProgress and the number of generated rounds is below `plannedRounds`, or the last round still has unsubmitted pod results
- **THEN** the status-actions panel shows the Pause button

#### Scenario: Open-ended event with no planned round count
- **WHEN** an event is InProgress and `plannedRounds` is not set
- **THEN** the status-actions panel shows the Pause button regardless of how many rounds have been played

#### Scenario: Last round has no pods
- **WHEN** an event is InProgress, `plannedRounds` is set, the number of generated rounds has reached `plannedRounds`, and the last round has zero pods
- **THEN** the last round is treated as complete
- **AND** the status-actions panel does not show the Pause button
