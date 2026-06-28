/**
 * MatchState — FT20 kill scoring (PROPOSED standalone rule set).
 *
 * A player only scores when the OPPONENT is defeated (a kill = +1). First to
 * `ftTarget` kills wins. Pure/deterministic.
 */
export class MatchState {
  constructor({ ftTarget }) {
    this.ftTarget = ftTarget;
    this.scores = { p1: 0, p2: 0 };
    this.winner = null;
  }

  /** Award a kill to 'p1' or 'p2'. Returns true if it ended the match. */
  addKill(scorer) {
    if (this.winner) return false;
    this.scores[scorer] += 1;
    if (this.scores[scorer] >= this.ftTarget) {
      this.winner = scorer.toUpperCase(); // 'P1' / 'P2'
      return true;
    }
    return false;
  }

  reset() {
    this.scores = { p1: 0, p2: 0 };
    this.winner = null;
  }
}
