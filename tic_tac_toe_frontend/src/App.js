import React, { useEffect, useMemo, useReducer, useState } from "react";
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
 * @param {"X"|"O"} startingPlayer
 * @returns {GameState}
 */
function createInitialState(startingPlayer = PLAYER_X) {
  return {
    board: Array(9).fill(null),
    nextPlayer: startingPlayer,
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
      // Reducer is game-only; starting player is controlled by React state outside.
      return createInitialState(state.nextPlayer);
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
 * Normalize/trim a player name and provide a safe fallback.
 * @param {string} value
 * @param {string} fallback
 * @returns {string}
 */
function normalizePlayerName(value, fallback) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Main app component: UI boundary layer for TicTacToeGameFlow.
 */
// PUBLIC_INTERFACE
function App() {
  // "Setup" flow: user enters names before playing.
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const [playerXName, setPlayerXName] = useState("Player 1");
  const [playerOName, setPlayerOName] = useState("Player 2");

  // Scoreboard (persists across rounds until reset).
  const [scores, setScores] = useState(() => ({ X: 0, O: 0, draws: 0 }));

  // Alternate starting player each round for fairness (explicit mapping).
  const [startingPlayer, setStartingPlayer] = useState(PLAYER_X);

  const [state, dispatch] = useReducer(ticTacToeReducer, undefined, () =>
    createInitialState(startingPlayer)
  );

  // Keep reducer's initial state aligned with the current starting player when starting a new match.
  useEffect(() => {
    dispatch({ type: "RESTART" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingPlayer]);

  // Update scoreboard once per finished round.
  const [lastCountedResultKey, setLastCountedResultKey] = useState(null);
  useEffect(() => {
    const resultKey = state.winner ? `W:${state.winner}` : state.isDraw ? "D" : null;

    if (!resultKey) {
      setLastCountedResultKey(null);
      return;
    }

    if (lastCountedResultKey === resultKey) return;

    setScores((prev) => {
      if (state.winner === PLAYER_X) return { ...prev, X: prev.X + 1 };
      if (state.winner === PLAYER_O) return { ...prev, O: prev.O + 1 };
      return { ...prev, draws: prev.draws + 1 };
    });

    setLastCountedResultKey(resultKey);
  }, [state.winner, state.isDraw, lastCountedResultKey]);

  const winningIndices = useMemo(
    () => getWinningIndices(state.winningLineStartIndex, state.winningLineDirection),
    [state.winningLineStartIndex, state.winningLineDirection]
  );

  const playerLabelForMark = useMemo(() => {
    return {
      X: normalizePlayerName(playerXName, "Player X"),
      O: normalizePlayerName(playerOName, "Player O"),
    };
  }, [playerXName, playerOName]);

  const status = useMemo(() => {
    if (state.winner) return `Winner: ${playerLabelForMark[state.winner]} (${state.winner})`;
    if (state.isDraw) return "Draw!";
    return `Turn: ${playerLabelForMark[state.nextPlayer]} (${state.nextPlayer})`;
  }, [state.winner, state.isDraw, state.nextPlayer, playerLabelForMark]);

  // Boundary handlers (validate + dispatch)
  // PUBLIC_INTERFACE
  const handleCellClick = (index) => {
    if (!isSetupComplete) return;
    dispatch({ type: "MAKE_MOVE", index });
  };

  // PUBLIC_INTERFACE
  const handleRestartRound = () => {
    // Keep same starting player for a "replay" of current mapping.
    dispatch({ type: "RESTART" });
    setLastCountedResultKey(null);
  };

  // PUBLIC_INTERFACE
  const handleNextRound = () => {
    // Alternate which mark starts next round, while keeping the same name-to-mark mapping.
    setStartingPlayer((prev) => (prev === PLAYER_X ? PLAYER_O : PLAYER_X));
    setLastCountedResultKey(null);
  };

  // PUBLIC_INTERFACE
  const handleResetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
  };

  // PUBLIC_INTERFACE
  const handleResetAll = () => {
    setIsSetupComplete(false);
    setPlayerXName("Player 1");
    setPlayerOName("Player 2");
    setScores({ X: 0, O: 0, draws: 0 });
    setStartingPlayer(PLAYER_X);
    setLastCountedResultKey(null);
  };

  const isGameOver = Boolean(state.winner || state.isDraw);

  // PUBLIC_INTERFACE
  const handleStartGame = (e) => {
    e.preventDefault();

    const normalizedX = normalizePlayerName(playerXName, "Player 1");
    const normalizedO = normalizePlayerName(playerOName, "Player 2");

    setPlayerXName(normalizedX);
    setPlayerOName(normalizedO);
    setIsSetupComplete(true);

    // Start fresh.
    setScores({ X: 0, O: 0, draws: 0 });
    setStartingPlayer(PLAYER_X);
    setLastCountedResultKey(null);
  };

  return (
    <div className="App">
      <main className="page">
        <section className="card" aria-label="Tic Tac Toe">
          <header className="header">
            <div>
              <h1 className="title">Tic Tac Toe</h1>
              <p className="subtitle">
                Local two-player · 3×3 · {playerLabelForMark.X} is X, {playerLabelForMark.O} is O
              </p>
            </div>

            <div className="statusWrap" aria-live="polite">
              <span className={`statusPill ${state.winner ? "statusPill--win" : ""}`}>
                {isSetupComplete ? status : "Enter player names to start"}
              </span>
            </div>
          </header>

          {!isSetupComplete ? (
            <section className="setupCard" aria-label="Player setup">
              <h2 className="sectionTitle">Players</h2>
              <p className="sectionSubtitle">
                Set names below. X always goes first in the first round (then we alternate starting
                player each round).
              </p>

              <form className="setupForm" onSubmit={handleStartGame}>
                <div className="fieldRow">
                  <label className="fieldLabel" htmlFor="playerX">
                    Player X
                  </label>
                  <input
                    id="playerX"
                    className="textInput"
                    value={playerXName}
                    onChange={(e) => setPlayerXName(e.target.value)}
                    placeholder="Player 1"
                    autoComplete="off"
                    maxLength={24}
                  />
                  <div className="markPill markPill--x" aria-hidden="true">
                    X
                  </div>
                </div>

                <div className="fieldRow">
                  <label className="fieldLabel" htmlFor="playerO">
                    Player O
                  </label>
                  <input
                    id="playerO"
                    className="textInput"
                    value={playerOName}
                    onChange={(e) => setPlayerOName(e.target.value)}
                    placeholder="Player 2"
                    autoComplete="off"
                    maxLength={24}
                  />
                  <div className="markPill markPill--o" aria-hidden="true">
                    O
                  </div>
                </div>

                <div className="setupActions">
                  <button type="submit" className="btnPrimary">
                    Start Game
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <>
              <section className="dashboard" aria-label="Score dashboard">
                <div className="scoreGrid">
                  <div className="scoreCard">
                    <div className="scoreTop">
                      <span className="scoreLabel">
                        {playerLabelForMark.X} <span className="scoreMark scoreMark--x">(X)</span>
                      </span>
                      <span className="scoreValue" aria-label={`${playerLabelForMark.X} wins`}>
                        {scores.X}
                      </span>
                    </div>
                    <div className="scoreHint">Wins</div>
                  </div>

                  <div className="scoreCard">
                    <div className="scoreTop">
                      <span className="scoreLabel">Draws</span>
                      <span className="scoreValue" aria-label="Draws">
                        {scores.draws}
                      </span>
                    </div>
                    <div className="scoreHint">No winner</div>
                  </div>

                  <div className="scoreCard">
                    <div className="scoreTop">
                      <span className="scoreLabel">
                        {playerLabelForMark.O} <span className="scoreMark scoreMark--o">(O)</span>
                      </span>
                      <span className="scoreValue" aria-label={`${playerLabelForMark.O} wins`}>
                        {scores.O}
                      </span>
                    </div>
                    <div className="scoreHint">Wins</div>
                  </div>
                </div>

                <div className="dashActions">
                  <button type="button" className="btnSecondary" onClick={handleResetScores}>
                    Reset Scores
                  </button>
                  <button type="button" className="btnGhostDanger" onClick={handleResetAll}>
                    Reset Players & Scores
                  </button>
                </div>
              </section>

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
                        aria-label={`Cell ${idx + 1}${
                          cell ? `: ${cell} (${playerLabelForMark[cell]})` : ""
                        }`}
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
                {isGameOver ? (
                  <>
                    <button type="button" className="btnPrimary" onClick={handleNextRound}>
                      Next Round (alternate start)
                    </button>
                    <button type="button" className="btnSecondary" onClick={handleRestartRound}>
                      Replay Round
                    </button>
                  </>
                ) : (
                  <button type="button" className="btnPrimary" onClick={handleRestartRound}>
                    Restart Round
                  </button>
                )}

                <div className="helpText">
                  {isGameOver
                    ? "Round complete. Start the next round to alternate who goes first."
                    : `Tip: ${playerLabelForMark[state.nextPlayer]} is up.`}
                </div>
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
