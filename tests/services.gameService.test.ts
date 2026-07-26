import { describe, expect, it } from 'vitest';
import { createPlayer } from '../src/services/playerService';
import { getProfile } from '../src/services/ruleProfileService';
import { createGame, getActiveGame, recordWin, undoLastHand } from '../src/services/gameService';
import { getStatistics } from '../src/services/statisticsService';
import { dragon, suit, wind, type Tile } from '../src/rule-engine/tiles';
import type { Meld } from '../src/rule-engine/hand';

const allPongsSelfDrawHand: Tile[] = [
  suit('characters', 1), suit('characters', 1), suit('characters', 1),
  suit('dots', 5), suit('dots', 5), suit('dots', 5),
  wind('east'), wind('east'), wind('east'),
  dragon('red'), dragon('red'), dragon('red'),
  suit('bamboo', 9), suit('bamboo', 9),
];

async function setUpGame() {
  const players = await Promise.all(['阿明', '阿珍', '阿強', '阿玲'].map((n) => createPlayer(n)));
  const ruleProfile = (await getProfile('hk-classic'))!;
  const game = await createGame({
    playerIds: players.map((p) => p.id),
    ruleProfileId: ruleProfile.id,
    chipMode: { type: 'perFan', chipsPerFan: 1 },
  });
  return { players, ruleProfile, game };
}

describe('createGame', () => {
  it('seats players in order and assigns winds starting from the dealer', async () => {
    const { players, game } = await setUpGame();
    expect(game.dealerSeatIndex).toBe(0);
    expect(game.seatWinds[players[0].id]).toBe('east');
    expect(game.seatWinds[players[1].id]).toBe('south');
    expect(game.seatWinds[players[2].id]).toBe('west');
    expect(game.seatWinds[players[3].id]).toBe('north');
    expect(Object.values(game.scores).every((s) => s === 0)).toBe(true);
  });
});

describe('recordWin', () => {
  it('pays a self-draw win from every opponent and keeps the dealer on a dealer win', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    const { game: updated, fanResult } = await recordWin({
      game,
      ruleProfile,
      winnerId: players[0].id, // the dealer
      selfDraw: true,
      discarderId: null,
      tiles: allPongsSelfDrawHand,
      melds: [],
    });

    expect(fanResult.totalFan).toBeGreaterThanOrEqual(ruleProfile.rules.minFan);
    // Dealer won -> stays dealer (連莊), dealerBonus doubles the payment.
    expect(updated.dealerSeatIndex).toBe(0);
    const perOpponent = fanResult.totalFan * ruleProfile.rules.dealerBonus;
    expect(updated.scores[players[0].id]).toBe(perOpponent * 3);
    expect(updated.scores[players[1].id]).toBe(-perOpponent);
    expect(updated.scores[players[2].id]).toBe(-perOpponent);
    expect(updated.scores[players[3].id]).toBe(-perOpponent);
  });

  it('rotates the dealer when a non-dealer wins', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    const { game: updated } = await recordWin({
      game,
      ruleProfile,
      winnerId: players[1].id,
      selfDraw: true,
      discarderId: null,
      tiles: allPongsSelfDrawHand,
      melds: [],
    });
    expect(updated.dealerSeatIndex).toBe(1);
    expect(updated.seatWinds[players[1].id]).toBe('east');
    expect(updated.seatWinds[players[0].id]).toBe('north');
  });

  it('charges only the discarder on a discard win', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    const { game: updated, fanResult } = await recordWin({
      game,
      ruleProfile,
      winnerId: players[1].id,
      selfDraw: false,
      discarderId: players[2].id,
      tiles: allPongsSelfDrawHand,
      melds: [],
    });
    expect(updated.scores[players[1].id]).toBe(fanResult.totalFan);
    expect(updated.scores[players[2].id]).toBe(-fanResult.totalFan);
    expect(updated.scores[players[0].id]).toBe(0);
    expect(updated.scores[players[3].id]).toBe(0);
  });

  it('updates statistics for the winner', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    await recordWin({
      game,
      ruleProfile,
      winnerId: players[0].id,
      selfDraw: true,
      discarderId: null,
      tiles: allPongsSelfDrawHand,
      melds: [],
    });
    const stats = await getStatistics(players[0].id);
    expect(stats?.handsWon).toBe(1);
    expect(stats?.selfDrawCount).toBe(1);
    expect(stats?.gamesPlayed).toBe(1);
  });

  it('does not award Concealed Hand when a meld is exposed, but still awards All Pongs', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    const exposedMeld: Meld = { type: 'pong', tiles: [wind('west'), wind('west'), wind('west')], concealed: false };
    const concealedTiles: Tile[] = [
      suit('characters', 1), suit('characters', 1), suit('characters', 1),
      suit('dots', 5), suit('dots', 5), suit('dots', 5),
      dragon('red'), dragon('red'), dragon('red'),
      suit('bamboo', 9), suit('bamboo', 9),
    ];
    const { fanResult } = await recordWin({
      game,
      ruleProfile,
      winnerId: players[0].id,
      selfDraw: true,
      discarderId: null,
      tiles: concealedTiles,
      melds: [exposedMeld],
    });
    const byLabel = (label: string) => fanResult.breakdown.find((r) => r.label === label);
    expect(byLabel('門前清')?.awarded).toBe(false);
    expect(byLabel('碰碰胡')?.awarded).toBe(true);
  });
});

describe('undoLastHand', () => {
  it('restores scores, dealer, and round wind to before the hand', async () => {
    const { players, ruleProfile, game } = await setUpGame();
    await recordWin({
      game,
      ruleProfile,
      winnerId: players[1].id,
      selfDraw: true,
      discarderId: null,
      tiles: allPongsSelfDrawHand,
      melds: [],
    });
    const restored = await undoLastHand(game.id);
    expect(restored.dealerSeatIndex).toBe(0);
    expect(Object.values(restored.scores).every((s) => s === 0)).toBe(true);
    expect(restored.handNumber).toBe(1);
  });
});

describe('getActiveGame', () => {
  it('finds the game created above', async () => {
    const { game } = await setUpGame();
    const active = await getActiveGame();
    expect(active?.id).toBe(game.id);
  });
});
