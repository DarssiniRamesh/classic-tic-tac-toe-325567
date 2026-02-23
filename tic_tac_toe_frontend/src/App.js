import React, { useMemo, useReducer } from "react";
import "./App.css";

/**
 * Tic Tac Toe domain constants.
 * Invariants:
 * - board length is always 9
 * - each cell is null | "X" | "O"
 */
const PLAYER_X = "X";
const PLAYER_O = "O";

/**
 * @typedef {Object} GameState
 * @property {(null|"X"|"O")[]} board
 * @property {"X"|"O"} nextPlayer
 * @property {number|null} winningLineStartIndex
 * @property {number|null} winningLineDirection
 * @property {"X"|"O"|null} winner
 * @property {boolean} isDraw
 */

/**
 * @typedef {Object} GameAction
 * @property {"MAKE_MOVE"|"RESTART"} type
 * @property {number} [index]
 */

/**
 * Build a new initial game state.
 * @returns {GameState}
 */
function createInitialState() {
  return {
    board: Array(9).fill(null),
    nextPlayer: PLAYER_X,
    winningLineStartIndex: null,
    winningLineDirection: null,
    winner: null,
    isDraw: false,
  };
}

/**
 * Determine game result (winner/draw) from a board.
 * Contract:
 * - Inputs: board (length 9 array of null|"X"|"O")
 * - Outputs:
 *    - winner: "X"|"O"|null
 *    - winningLine: { startIndex: number, direction: number } | null
 *    - isDraw: boolean (true iff no winner and no empty cells)
 * - Errors: throws if board is not length 9 (defensive)
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {{ winner: ("X"|"O"|null), winningLine: ({startIndex:number, direction:number}|null), isDraw: boolean }}
 */
function evaluateBoard(board) {
  if (!Array.isArray(board) || board.length !== 9) {
    throw new Error("evaluateBoard: board must be an array of length 9.");
  }

  // Lines represented as [a,b,c, startIndex, direction] so UI can draw a line.
  // Directions map to CSS line transforms (see App.css):
  // 0: horizontal, 1: vertical, 2: diag down-right, 3: diag down-left
  const lines = [
    // rows
    [0, 1, 2, 0, 0],
    [3, 4, 5, 3, 0],
    [6, 7, 8, 6, 0],
    // cols
    [0, 3, 6, 0, 1],
    [1, 4, 7, 1, 1],
    [2, 5, 8, 2, 1],
    // diags
    [0, 4, 8, 0, 2],
    [2, 4, 6, 2, 3],
  ];

  for (const [a, b, c, startIndex, direction] of lines) {
    const v = board[a];
    if (v && v === board[b] && v === board[c]) {
      return {
        winner: v,
        winningLine: { startIndex, direction },
        isDraw: false,
      };
    }
  }

  const hasEmpty = board.some((cell) => cell === null);
  return { winner: null, winningLine: null, isDraw: !hasEmpty };
}

/**
 * Reusable game flow entrypoint (pure reducer).
 * Flow name: TicTacToeGameFlow
 * Single entrypoint: ticTacToeReducer(state, action)
 *
 * Contract:
 * - Inputs: GameState + GameAction
 * - Outputs: next GameState (immutable updates)
 * - Errors: throws on invalid move index
 * - Side effects: none (pure)
 *
 * @param {GameState} state
 * @param {GameAction} action
 * @returns {GameState}
 */
function ticTacToeReducer(state, action) {
  switch (action.type) {
    case "RESTART": {
      return createInitialState();
    }

    case "MAKE_MOVE": {
      const index = action.index;

      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 8) {
        throw new Error("MAKE_MOVE: index must be an integer between 0 and 8.");
      }

      // If game is finished, ignore moves (deterministic behavior).
      if (state.winner || state.isDraw) return state;

      // If cell is occupied, ignore.
      if (state.board[index] !== null) return state;

      const nextBoard = state.board.slice();
      nextBoard[index] = state.nextPlayer;

      const { winner, winningLine, isDraw } = evaluateBoard(nextBoard);

      return {
        board: nextBoard,
        nextPlayer: state.nextPlayer === PLAYER_X ? PLAYER_O : PLAYER_X,
        winner,
        isDraw,
        winningLineStartIndex: winningLine ? winningLine.startIndex : null,
        winningLineDirection: winningLine ? winningLine.direction : null,
      };
    }

    default:
      return state;
  }
}

/**
 * Returns a set of indices that are part of the winning line.
 * @param {number|null} startIndex
 * @param {number|null} direction
 * @returns {Set<number>}
 */
function getWinningIndices(startIndex, direction) {
  if (startIndex === null || direction === null) return new Set();
  if (direction === 0) return new Set([startIndex, startIndex + 1, startIndex + 2]);
  if (direction === 1) return new Set([startIndex, startIndex + 3, startIndex + 6]);
  if (direction === 2) return new Set([0, 4, 8]);
  if (direction === 3) return new Set([2, 4, 6]);
  return new Set();
}

/**
 * Main app component: UI boundary layer for TicTacToeGameFlow.
 */
// PUBLIC_INTERFACE
function App() {
  const [state, dispatch] = useReducer(ticTacToeReducer, undefined, createInitialState);

  const winningIndices = useMemo(
    () => getWinningIndices(state.winningLineStartIndex, state.winningLineDirection),
    [state.winningLineStartIndex, state.winningLineDirection]
  );

  const status = useMemo(() => {
    if (state.winner) return `Winner: ${state.winner}`;
    if (state.isDraw) return "Draw!";
    return `Turn: ${state.nextPlayer}`;
  }, [state.winner, state.isDraw, state.nextPlayer]);

  // Boundary handlers (validate + dispatch)
  // PUBLIC_INTERFACE
  const handleCellClick = (index) => {
    dispatch({ type: "MAKE_MOVE", index });
  };

  // PUBLIC_INTERFACE
  const handleRestart = () => {
    dispatch({ type: "RESTART" });
  };

  const isGameOver = Boolean(state.winner || state.isDraw);

  return (
    <div className="App">
      <main className="page">
        <section className="card" aria-label="Tic Tac Toe">
          <header className="header">
            <div>
              <h1 className="title">Tic Tac Toe</h1>
              <p className="subtitle">Local two-player · 3×3</p>
            </div>

            <div className="statusWrap" aria-live="polite">
              <span className={`statusPill ${state.winner ? "statusPill--win" : ""}`}>
                {status}
              </span>
            </div>
          </header>

          <div className="boardWrap">
            <div className="board" role="grid" aria-label="Game board">
              {state.board.map((cell, idx) => {
                const isWinningCell = winningIndices.has(idx);
                const isDisabled = cell !== null || isGameOver;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={[
                      "cell",
                      cell ? `cell--${cell}` : "",
                      isWinningCell ? "cell--win" : "",
                    ].join(" ")}
                    onClick={() => handleCellClick(idx)}
                    disabled={isDisabled}
                    role="gridcell"
                    aria-label={`Cell ${idx + 1}${cell ? `: ${cell}` : ""}`}
                  >
                    <span className="cellValue" aria-hidden="true">
                      {cell}
                    </span>
                  </button>
                );
              })}

              {state.winner && state.winningLineDirection !== null && (
                <div
                  className={[
                    "winLine",
                    `winLine--dir-${state.winningLineDirection}`,
                    `winLine--start-${state.winningLineStartIndex}`,
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          <footer className="footer">
            <button type="button" className="btnPrimary" onClick={handleRestart}>
              Restart
            </button>

            <div className="helpText">
              Tip: Click a square to place your mark. Game ends on win or draw.
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
