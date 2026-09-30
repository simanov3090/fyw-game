'use client';

import { useEffect, useRef, useState } from 'react';

type Position = { row: number; col: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type GameState = {
  car: Position;
  coin: Position;
  coinId: number;
  direction: Direction;
  score: number;
};
type Trail = Position & { id: number };

const BOARD_SIZE = 8;
const START: Position = { row: 4, col: 3 };
const STARTING_TIME = 10;
const TIME_STEP = 0.4;
const MIN_TIME = 2.5;
const INITIAL_GAME: GameState = {
  car: START,
  coin: { row: 1, col: 1 },
  coinId: 0,
  direction: 'up',
  score: 0,
};

const MOVES: Record<string, { direction: Direction; row: number; col: number }> = {
  ArrowUp: { direction: 'up', row: -1, col: 0 },
  ArrowDown: { direction: 'down', row: 1, col: 0 },
  ArrowLeft: { direction: 'left', row: 0, col: -1 },
  ArrowRight: { direction: 'right', row: 0, col: 1 },
};

function randomFreeCell(car: Position): Position {
  const freeCells: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (row !== car.row || col !== car.col) freeCells.push({ row, col });
    }
  }

  return freeCells[Math.floor(Math.random() * freeCells.length)];
}

function getCoinTime(score: number): number {
  return Math.max(MIN_TIME, Number((STARTING_TIME - score * TIME_STEP).toFixed(1)));
}

export default function Home() {
  const [game, setGame] = useState(INITIAL_GAME);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [timeLeft, setTimeLeft] = useState(STARTING_TIME);
  const [gameOver, setGameOver] = useState(false);
  const gameRef = useRef(game);
  const gameOverRef = useRef(false);
  const timeLeftRef = useRef(STARTING_TIME);
  const nextTrailId = useRef(0);
  const trailTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTrailTimers = trailTimers.current;
    const initialGame = {
      ...gameRef.current,
      coin: randomFreeCell(gameRef.current.car),
      coinId: gameRef.current.coinId + 1,
    };
    gameRef.current = initialGame;
    setGame(initialGame);

    function handleKeyDown(event: KeyboardEvent) {
      const move = MOVES[event.key];
      if (!move) return;

      event.preventDefault();
      if (gameOverRef.current) return;

      const current = gameRef.current;
      const car = {
        row: Math.max(0, Math.min(BOARD_SIZE - 1, current.car.row + move.row)),
        col: Math.max(0, Math.min(BOARD_SIZE - 1, current.car.col + move.col)),
      };
      const hasMoved = car.row !== current.car.row || car.col !== current.car.col;

      if (hasMoved) {
        const id = nextTrailId.current;
        nextTrailId.current += 1;
        setTrails((currentTrails) => [
          ...currentTrails,
          { id, row: current.car.row, col: current.car.col },
        ]);

        const timer = setTimeout(() => {
          setTrails((currentTrails) => currentTrails.filter((trail) => trail.id !== id));
          activeTrailTimers.delete(id);
        }, 2900);
        activeTrailTimers.set(id, timer);
      }

      const collected = hasMoved && car.row === current.coin.row && car.col === current.coin.col;
      if (collected) {
        const nextTime = getCoinTime(current.score + 1);
        timeLeftRef.current = nextTime;
        setTimeLeft(nextTime);
      }

      const nextGame: GameState = {
        car,
        coin: collected ? randomFreeCell(car) : current.coin,
        coinId: collected ? current.coinId + 1 : current.coinId,
        direction: move.direction,
        score: current.score + (collected ? 1 : 0),
      };

      gameRef.current = nextGame;
      setGame(nextGame);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      activeTrailTimers.forEach((timer) => clearTimeout(timer));
      activeTrailTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      const nextTime = Math.max(0, Math.round((timeLeftRef.current - 0.1) * 10) / 10);
      timeLeftRef.current = nextTime;
      setTimeLeft(nextTime);

      if (nextTime === 0) {
        gameOverRef.current = true;
        setGameOver(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game.coinId, gameOver]);

  function restartGame() {
    trailTimers.current.forEach((timer) => clearTimeout(timer));
    trailTimers.current.clear();
    gameOverRef.current = false;
    timeLeftRef.current = STARTING_TIME;
    setTimeLeft(STARTING_TIME);
    setGameOver(false);
    const current = gameRef.current;
    const restarted: GameState = {
      car: START,
      coin: randomFreeCell(START),
      coinId: current.coinId + 1,
      direction: 'up',
      score: 0,
    };
    gameRef.current = restarted;
    setGame(restarted);
    setTrails([]);
  }

  return (
    <main className="game-page">
      <section className="game-shell" aria-label="Coin Racer">
        <header className="game-header">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <span /><span /><span />
            </span>
            <div>
              <p className="eyebrow">FIELD NOTES · 01</p>
              <h1>Coin Racer</h1>
            </div>
          </div>
          <div className="header-stats">
            <div className="score-panel" aria-live="polite" aria-atomic="true">
              <span className="score-label">SCORE</span>
              <span className="score-value">{String(game.score).padStart(2, '0')}</span>
            </div>
            <div
              className={`time-panel${timeLeft <= 3 ? ' time-panel-urgent' : ''}`}
              role="timer"
              aria-label={`Осталось ${timeLeft.toFixed(1)} секунд`}
            >
              <div className="time-panel-labels">
                <span className="score-label">TIME</span>
                <span className="time-value">{timeLeft.toFixed(1)}s</span>
              </div>
              <span className="time-track" aria-hidden="true">
                <span style={{ width: `${(timeLeft / getCoinTime(game.score)) * 100}%` }} />
              </span>
            </div>
          </div>
        </header>

        <div className="game-layout">
          <div className="field-column">
            <div className="field-meta">
              <span><span className="status-dot" /> ЛУГОВОЙ МАРШРУТ</span>
              <span>08 × 08</span>
            </div>
            <div className="board-frame">
              <div className="game-board" role="grid" aria-label="Игровое поле 8 на 8">
                {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
                  const row = Math.floor(index / BOARD_SIZE);
                  const col = index % BOARD_SIZE;
                  const isCar = row === game.car.row && col === game.car.col;
                  const isCoin = row === game.coin.row && col === game.coin.col;

                  return (
                    <div className="grass-cell" role="gridcell" key={index}>
                      {isCoin && (
                        <span className="coin" key={game.coinId} aria-label="Монетка">
                          <span className="coin-disc">
                            <span className="coin-emblem" />
                          </span>
                        </span>
                      )}
                      {isCar && (
                        <span
                          className={`car car-${game.direction}`}
                          aria-label="Красная машинка"
                        >
                          <span className="car-roof" />
                          <span className="car-window" />
                          <span className="car-grille" />
                          <span className="car-light car-light-front" />
                          <span className="car-light car-light-back" />
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="trail-layer" aria-hidden="true">
                  {trails.map((trail) => (
                    <span
                      className="trail"
                      key={trail.id}
                      style={{ gridRow: trail.row + 1, gridColumn: trail.col + 1 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="field-footer">
              <span>СОБЕРИ МОНЕТЫ</span>
              <span className="footer-dash" />
              <span>НЕ ТЕРЯЙ ТРОПУ</span>
            </div>
          </div>

          <aside className="game-aside">
            <div className="aside-topline"><span>ПРАВИЛА ПОЛЯ</span><span>01 / 01</span></div>
            <h2>Небольшая<br />прогулка.</h2>
            <p className="aside-copy">
              Собирай золотые монеты, пока красный родстер прокладывает путь по траве.
            </p>

            <div className="control-guide">
              <div className="guide-icon" aria-hidden="true">
                <span className="key key-up">↑</span>
                <span className="key-row"><span className="key">←</span><span className="key">↓</span><span className="key">→</span></span>
              </div>
              <div>
                <span className="guide-title">Управление</span>
                <span className="guide-copy">Стрелки на клавиатуре</span>
              </div>
            </div>

            <button className="restart-button" onClick={restartGame}>
              <span className="restart-icon" aria-hidden="true">↻</span>
              Начать заново
            </button>
            <p className="aside-footnote"><span>●</span> Следы исчезают сами через пару секунд</p>
          </aside>
        </div>
        <footer className="page-footer">
          <span>COIN RACER</span>
          <span>ДВИЖЕНИЕ · МОНЕТЫ · СВЕЖАЯ ТРАВА</span>
        </footer>
      </section>
      {gameOver && (
        <div className="game-over-backdrop">
          <section className="game-over-card" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
            <span className="game-over-kicker">МАРШРУТ ЗАВЕРШЁН</span>
            <h2 id="game-over-title">Game Over</h2>
            <p>Время на эту монету вышло.</p>
            <div className="final-score">
              <span>СОБРАНО МОНЕТ</span>
              <strong>{String(game.score).padStart(2, '0')}</strong>
            </div>
            <button className="restart-button" onClick={restartGame}>
              <span className="restart-icon" aria-hidden="true">↻</span>
              Играть снова
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
