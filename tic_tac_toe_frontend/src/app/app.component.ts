import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AppComponent renders the Tic Tac Toe game with Ocean Professional theme.
 * It manages turn state, board state, score, and user interactions.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  // Theme constants
  readonly primary = '#2563EB'; // blue
  readonly secondary = '#F59E0B'; // amber
  readonly error = '#EF4444';
  readonly bg = '#f9fafb';
  readonly surface = '#ffffff';
  readonly text = '#111827';

  // Game state using Angular signals for reactivity
  board = signal<(null | 'X' | 'O')[]>(Array(9).fill(null));
  xIsNext = signal<boolean>(true);
  // Persisted score from localStorage
  score = signal<{ X: number; O: number; draws: number }>(this.loadScore());

  // Derived/computed signals
  currentPlayer = computed(() => (this.xIsNext() ? 'X' : 'O'));
  winner = computed<null | 'X' | 'O' | 'draw'>(() => this.calculateWinner(this.board()));

  statusText = computed(() => {
    const win = this.winner();
    if (win === 'draw') return 'It’s a draw. Play again!';
    if (win === 'X' || win === 'O') return `Winner: ${win}`;
    return `Turn: ${this.currentPlayer()}`;
  });

  // PUBLIC_INTERFACE
  newGame(): void {
    /** Starts a new round while keeping the cumulative score. */
    this.board.set(Array(9).fill(null));
    // Alternate who starts first each game for fairness
    this.xIsNext.set(!this.xIsNext());
  }

  // PUBLIC_INTERFACE
  resetMatch(): void {
    /** Resets the entire match and clears scores from localStorage. */
    this.board.set(Array(9).fill(null));
    this.xIsNext.set(true);
    this.score.set({ X: 0, O: 0, draws: 0 });
    this.persistScore();
  }

  // PUBLIC_INTERFACE
  handleClick(index: number): void {
    /** Handles a click on a board cell. */
    const board = this.board().slice();
    // Ignore clicks if occupied or if game is finished
    if (board[index] || this.winner()) return;

    board[index] = this.currentPlayer();
    this.board.set(board);

    const win = this.calculateWinner(board);
    if (win) {
      // Update score once when the game concludes
      if (win === 'draw') {
        this.updateScore({ draws: 1 });
      } else if (win === 'X') {
        this.updateScore({ X: 1 });
      } else if (win === 'O') {
        this.updateScore({ O: 1 });
      }
      this.persistScore();
      return;
    }

    // Toggle turn
    this.xIsNext.set(!this.xIsNext());
  }

  private updateScore(delta: Partial<{ X: number; O: number; draws: number }>): void {
    const current = this.score();
    this.score.set({
      X: current.X + (delta.X ?? 0),
      O: current.O + (delta.O ?? 0),
      draws: current.draws + (delta.draws ?? 0),
    });
  }

  private isBrowser(): boolean {
    return typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined';
  }

  private loadScore(): { X: number; O: number; draws: number } {
    try {
      const storage = this.isBrowser() ? (globalThis as any).localStorage as { getItem: (k: string) => string | null } : undefined;
      const raw = storage?.getItem('ttt_score');
      if (!raw) return { X: 0, O: 0, draws: 0 };
      const parsed = JSON.parse(raw);
      const X = Number(parsed?.X ?? 0);
      const O = Number(parsed?.O ?? 0);
      const draws = Number(parsed?.draws ?? 0);
      if ([X, O, draws].some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Invalid score');
      return { X, O, draws };
    } catch {
      return { X: 0, O: 0, draws: 0 };
    }
  }

  private persistScore(): void {
    try {
      const storage = this.isBrowser() ? (globalThis as any).localStorage as { setItem: (k: string, v: string) => void } : undefined;
      storage?.setItem('ttt_score', JSON.stringify(this.score()));
    } catch {
      // In private mode or storage full: ignore persistence errors
    }
  }

  private calculateWinner(squares: (null | 'X' | 'O')[]): null | 'X' | 'O' | 'draw' {
    // All winning line combinations
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // cols
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ] as const;

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]; // 'X' or 'O'
      }
    }
    // If no nulls remain and no winner, it is a draw
    if (squares.every((s) => s)) return 'draw';
    return null; // game ongoing
  }
}
