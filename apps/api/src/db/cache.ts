// Composant d'accès aux données NoSQL (clé-valeur).
//
// Deux implémentations partagent la même interface `Cache` :
//  - RedisCache : store NoSQL Redis (production / self-hosting) via ioredis.
//  - MemoryCache : repli en mémoire (développement, CI, tests — aucun Redis requis).
//
// L'implémentation Redis est résiliente : toute erreur Redis dégrade en
// « cache miss » plutôt que de faire échouer la requête (la BDD SQL reste
// la source de vérité).
import Redis from "ioredis";
import { env } from "../config/env.js";

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  readonly backend: "redis" | "memory";
}

/** Repli mémoire — Map avec expiration. Utilisé si REDIS_URL est absent. */
export class MemoryCache implements Cache {
  readonly backend = "memory" as const;
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/** Store NoSQL Redis. Sérialisation JSON, résilient aux pannes. */
export class RedisCache implements Cache {
  readonly backend = "redis" as const;
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.client.on("error", (e) => console.error("[cache] redis error:", e.message));
    this.client.connect().catch((e) => console.error("[cache] redis connect failed:", e.message));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null; // dégrade en cache miss
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds) await this.client.set(key, payload, "EX", ttlSeconds);
      else await this.client.set(key, payload);
    } catch {
      /* non bloquant */
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      /* non bloquant */
    }
  }
}

/** Fabrique : Redis si REDIS_URL est défini, sinon repli mémoire. */
export function createCache(): Cache {
  if (env.REDIS_URL) {
    console.log("[cache] backend: redis");
    return new RedisCache(env.REDIS_URL);
  }
  console.log("[cache] backend: memory (REDIS_URL non défini)");
  return new MemoryCache();
}

/** Cache inerte (no-op) — défaut pratique pour les tests unitaires. */
export const noopCache: Cache = {
  backend: "memory",
  async get() {
    return null;
  },
  async set() {},
  async del() {},
};

/** Clé de cache du mot du jour pour une date donnée. */
export const dailyWordKey = (date: string) => `daily_word:${date}`;
