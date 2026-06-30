CREATE TABLE IF NOT EXISTS daily_words (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date       DATE        NOT NULL UNIQUE,
  word       VARCHAR(5)  NOT NULL,
  created_by INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_word_id INTEGER NOT NULL REFERENCES daily_words(id) ON DELETE CASCADE,
  status        VARCHAR(11) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','won','lost')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  UNIQUE (user_id, daily_word_id)
);

CREATE TABLE IF NOT EXISTS guesses (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  guess          VARCHAR(5) NOT NULL,
  result         JSONB    NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_guesses_game ON guesses(game_id);
