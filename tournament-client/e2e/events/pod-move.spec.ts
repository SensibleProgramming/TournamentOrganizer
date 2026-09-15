import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import {
  stubUnmatchedApi,
  mockGetEvent,
  mockGetEventPlayers,
  mockGetEventRounds,
  mockMovePlayer,
  makeEventDto,
  makeEventPlayerDto,
} from '../helpers/api-mock';
import { PodDto } from '../../src/app/core/models/api.models';

// Route registration order: stubUnmatchedApi FIRST (LIFO — last registered wins).

const EVENT_ID = 1;
const STORE_ID = 1;

const IP_EVENT = makeEventDto({ id: EVENT_ID, status: 'InProgress', playerCount: 8, storeId: STORE_ID });

const POD_1: PodDto = {
  podId: 1, podNumber: 1, finishGroup: null, gameId: 10, gameStatus: 'Pending', winnerPlayerId: null,
  players: [
    { playerId: 1, name: 'Alice', conservativeScore: 10, seatOrder: 1 },
    { playerId: 2, name: 'Bob', conservativeScore: 10, seatOrder: 2 },
    { playerId: 3, name: 'Carol', conservativeScore: 10, seatOrder: 3 },
    { playerId: 4, name: 'Dave', conservativeScore: 10, seatOrder: 4 },
  ],
};

const POD_2: PodDto = {
  podId: 2, podNumber: 2, finishGroup: null, gameId: 20, gameStatus: 'Pending', winnerPlayerId: null,
  players: [
    { playerId: 5, name: 'Eve', conservativeScore: 10, seatOrder: 1 },
    { playerId: 6, name: 'Finn', conservativeScore: 10, seatOrder: 2 },
    { playerId: 7, name: 'Gus', conservativeScore: 10, seatOrder: 3 },
    { playerId: 8, name: 'Hana', conservativeScore: 10, seatOrder: 4 },
  ],
};

test.describe('Pod player move (drag-and-drop)', () => {
  // The default Playwright viewport (1280x720) is too narrow for the sidenav + two-pod
  // grid layout: pod-2 renders past x=1280, so document.elementFromPoint() (which CDK's
  // cdkDropList hit-test relies on to recognize a drop target) returns null for any
  // coordinate inside it, and every drag silently reverts to the source pod. Widen the
  // viewport so both pods are fully on-screen.
  test.use({ viewport: { width: 1600, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await stubUnmatchedApi(page);
    await loginAs(page, 'StoreEmployee', { storeId: STORE_ID });
    await mockGetEvent(page, IP_EVENT);
    await mockGetEventPlayers(page, EVENT_ID, [1, 2, 3, 4, 5, 6, 7, 8].map(id =>
      makeEventPlayerDto({ playerId: id, name: `Player ${id}` })));
    await mockGetEventRounds(page, EVENT_ID, [{ roundId: 1, roundNumber: 1, pods: [POD_1, POD_2] }]);

    const moveResult = {
      sourcePod: { ...POD_1, players: POD_1.players.filter(p => p.playerId !== 1) },
      targetPod: { ...POD_2, players: [...POD_2.players, { playerId: 1, name: 'Alice', conservativeScore: 10, seatOrder: 5 }] },
    };
    await mockMovePlayer(page, moveResult);

    await page.goto(`/events/${EVENT_ID}`);
    await page.getByRole('tab', { name: 'Rounds' }).click();
  });

  test('dragging a player card from one pod to another moves the player', async ({ page }) => {
    const source = page.locator('#pod-1 .pod-player', { hasText: 'Alice' });
    const target = page.locator('#pod-2');

    await expect(source).toBeVisible();

    // The pod-grid's CSS grid (auto-fill, minmax(300px, 1fr)) can still be settling its
    // column widths right after the tab switch (web fonts/icons affecting intrinsic content
    // width). Wait for both the source and target elements to stop moving/resizing before
    // measuring their positions — otherwise boundingBox() can return stale coordinates,
    // pod-2's drop point can land outside the viewport, and document.elementFromPoint()
    // (which CDK's cdkDropList hit-test relies on) returns null for any point there, causing
    // the drag to silently revert to the source pod.
    const sourceHandle = await source.elementHandle();
    const targetHandle = await target.elementHandle();
    if (!sourceHandle || !targetHandle) throw new Error('Could not locate drag source/target elements');
    await sourceHandle.waitForElementState('stable');
    await targetHandle.waitForElementState('stable');

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    if (!sourceBox || !targetBox) throw new Error('Could not measure drag source/target');

    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Small initial move to cross CDK's drag-activation threshold before the real move begins.
    await page.mouse.move(startX + 5, startY + 5);
    await page.mouse.move(startX + 15, startY + 15, { steps: 10 });

    // Move gradually across many intermediate points so CDK's document-level mousemove
    // listener has a chance to compute the hovered drop list on each step (a single large
    // jump skips over the target's drop-zone detection).
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
    }
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('#pod-2 .pod-player', { hasText: 'Alice' })).toBeVisible();
    await expect(page.locator('#pod-1 .pod-player', { hasText: 'Alice' })).toHaveCount(0);
    await expect(page.locator('mat-snack-bar-container')).toContainText('Player moved');
  });

  test('shows a grab cursor on a draggable player row before dragging', async ({ page }) => {
    const source = page.locator('#pod-1 .pod-player', { hasText: 'Alice' });
    await expect(source).toBeVisible();
    await expect(source).toHaveCSS('cursor', 'grab');
  });

  test('shows a not-allowed cursor while dragging over a pod that is already full', async ({ page }) => {
    // Re-mock rounds so pod-2 is already at max capacity (5 players).
    const fullPod2: PodDto = {
      ...POD_2,
      players: [...POD_2.players, { playerId: 9, name: 'Ivy', conservativeScore: 10, seatOrder: 5 }],
    };
    await mockGetEventRounds(page, EVENT_ID, [{ roundId: 1, roundNumber: 1, pods: [POD_1, fullPod2] }]);
    await page.reload();
    await page.getByRole('tab', { name: 'Rounds' }).click();

    const source = page.locator('#pod-1 .pod-player', { hasText: 'Alice' });
    const target = page.locator('#pod-2');
    await expect(source).toBeVisible();

    const sourceHandle = await source.elementHandle();
    const targetHandle = await target.elementHandle();
    if (!sourceHandle || !targetHandle) throw new Error('Could not locate drag source/target elements');
    await sourceHandle.waitForElementState('stable');
    await targetHandle.waitForElementState('stable');

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    if (!sourceBox || !targetBox) throw new Error('Could not measure drag source/target');

    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 5, startY + 5);
    await page.mouse.move(startX + 15, startY + 15, { steps: 10 });

    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
    }
    await page.mouse.move(endX, endY, { steps: 10 });

    await expect(page.locator('#pod-2')).toHaveCSS('cursor', 'not-allowed');

    // Release away from the invalid target so the drag reverts cleanly.
    await page.mouse.up();
    await expect(page.locator('#pod-2 .pod-player', { hasText: 'Alice' })).toHaveCount(0);
  });
});
