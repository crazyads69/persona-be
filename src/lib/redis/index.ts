import { Redis } from "@upstash/redis";
import { env } from "../../config";

export const redis = new Redis({
	url: env.UPSTASH_REDIS_REST_URL,
	token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Redis key prefixes for various entities
export const REDIS_KEYS = {
	USER: (id: string) => `user:${id}`,
	USER_BY_EMAIL: (email: string) => `user:email:${email}`,
	USER_BY_USERNAME: (username: string) => `user:username:${username}`,
	USER_BY_FIREBASE_UID: (uid: string) => `user:firebase:${uid}`,
	CHARACTER: (id: string) => `character:${id}`,
	CHAT: (id: string) => `chat:${id}`,
	MESSAGE: (id: string) => `message:${id}`,
	PENDING_WRITE: (type: string, id: string) => `pending:${type}:${id}`,
} as const;

// Cache TTL configurations (in seconds) for different entities
export const CACHE_TTL = {
	USER: 3600, // 1 hour
	CHARACTER: 1800, // 30 minutes
	CHAT: 900, // 15 minutes
	MESSAGE: 600, // 10 minutes
	PENDING_WRITE: 300, // 5 minutes
} as const;
