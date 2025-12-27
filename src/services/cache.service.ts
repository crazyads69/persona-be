import type { NewUser, User } from "../db/schema";
import { publishWriteJob, type WriteJobPayload } from "../lib/qstash";
import { CACHE_TTL, REDIS_KEYS, redis } from "../lib/redis";

/**
 * Write-Behind Cache Service
 * Writes go to Redis immediately, then asynchronously synced to Turso via QStash
 */
export class CacheService {
	/**
	 * Set data in cache and schedule background write to database
	 */
	private async setWithWriteBehind<T extends Record<string, unknown>>(
		key: string,
		data: T,
		ttl: number,
		writePayload: WriteJobPayload<T>
	) {
		try {
			// Write to Redis immediately
			await redis.setex(key, ttl, JSON.stringify(data));

			// Schedule background write to Turso via QStash
			await publishWriteJob(writePayload, 2); // 2 second delay to batch writes

			return data;
		} catch (error) {
			console.error("Cache set with write-behind failed:", error);
			throw error;
		}
	}

	/**
	 * Get data from cache
	 */
	private async get<T>(key: string): Promise<T | null> {
		try {
			const cached = await redis.get<string>(key);
			if (!cached) return null;

			return typeof cached === "string" ? JSON.parse(cached) : cached;
		} catch (error) {
			console.error("Cache get failed:", error);
			return null;
		}
	}

	/**
	 * Delete from cache and schedule database deletion
	 */
	private async deleteWithWriteBehind(key: string, writePayload: WriteJobPayload) {
		try {
			// Delete from Redis immediately
			await redis.del(key);

			// Schedule background deletion in Turso
			await publishWriteJob(writePayload, 2);

			return true;
		} catch (error) {
			console.error("Cache delete with write-behind failed:", error);
			throw error;
		}
	}

	// ==================== USER OPERATIONS ====================

	/**
	 * Create user in cache and schedule DB write
	 */
	async createUser(userData: NewUser): Promise<User> {
		const user = {
			...userData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
		} as User;

		await this.setWithWriteBehind(REDIS_KEYS.USER(user.id), user, CACHE_TTL.USER, {
			operation: "create",
			table: "users",
			id: user.id,
			data: user,
			timestamp: Date.now(),
		});

		// Set secondary indexes
		await redis.setex(REDIS_KEYS.USER_BY_EMAIL(user.email), CACHE_TTL.USER, user.id);
		await redis.setex(REDIS_KEYS.USER_BY_USERNAME(user.username), CACHE_TTL.USER, user.id);
		await redis.setex(REDIS_KEYS.USER_BY_FIREBASE_UID(user.firebaseUid), CACHE_TTL.USER, user.id);

		return user;
	}

	/**
	 * Get user from cache
	 */
	async getUser(id: string): Promise<User | null> {
		return await this.get<User>(REDIS_KEYS.USER(id));
	}

	/**
	 * Get user by email from cache
	 */
	async getUserByEmail(email: string): Promise<User | null> {
		const userId = await redis.get<string>(REDIS_KEYS.USER_BY_EMAIL(email));
		if (!userId) return null;

		return await this.getUser(userId as string);
	}

	/**
	 * Get user by username from cache
	 */
	async getUserByUsername(username: string): Promise<User | null> {
		const userId = await redis.get<string>(REDIS_KEYS.USER_BY_USERNAME(username));
		if (!userId) return null;

		return await this.getUser(userId as string);
	}

	/**
	 * Get user by Firebase UID from cache
	 */
	async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
		const userId = await redis.get<string>(REDIS_KEYS.USER_BY_FIREBASE_UID(firebaseUid));
		if (!userId) return null;

		return await this.getUser(userId as string);
	}

	/**
	 * Update user in cache and schedule DB write
	 */
	async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
		const existingUser = await this.getUser(id);
		if (!existingUser) return null;

		const updatedUser = {
			...existingUser,
			...updates,
			id: existingUser.id, // Ensure ID doesn't change
			updatedAt: new Date().toISOString(),
		};

		await this.setWithWriteBehind(REDIS_KEYS.USER(id), updatedUser, CACHE_TTL.USER, {
			operation: "update",
			table: "users",
			id,
			data: updates,
			timestamp: Date.now(),
		});

		// Update secondary indexes if email or username changed
		if (updates.email && updates.email !== existingUser.email) {
			await redis.del(REDIS_KEYS.USER_BY_EMAIL(existingUser.email));
			await redis.setex(REDIS_KEYS.USER_BY_EMAIL(updates.email), CACHE_TTL.USER, id);
		}

		if (updates.username && updates.username !== existingUser.username) {
			await redis.del(REDIS_KEYS.USER_BY_USERNAME(existingUser.username));
			await redis.setex(REDIS_KEYS.USER_BY_USERNAME(updates.username), CACHE_TTL.USER, id);
		}

		return updatedUser;
	}

	/**
	 * Soft delete user in cache and schedule DB write
	 */
	async deleteUser(id: string): Promise<boolean> {
		const user = await this.getUser(id);
		if (!user) return false;

		await this.deleteWithWriteBehind(REDIS_KEYS.USER(id), {
			operation: "delete",
			table: "users",
			id,
			timestamp: Date.now(),
		});

		// Clean up secondary indexes
		await redis.del(REDIS_KEYS.USER_BY_EMAIL(user.email));
		await redis.del(REDIS_KEYS.USER_BY_USERNAME(user.username));
		await redis.del(REDIS_KEYS.USER_BY_FIREBASE_UID(user.firebaseUid));

		return true;
	}

	/**
	 * Invalidate all user-related caches
	 */
	async invalidateUserCache(id: string): Promise<void> {
		const user = await this.getUser(id);
		if (!user) return;

		await redis.del(REDIS_KEYS.USER(id));
		await redis.del(REDIS_KEYS.USER_BY_EMAIL(user.email));
		await redis.del(REDIS_KEYS.USER_BY_USERNAME(user.username));
		await redis.del(REDIS_KEYS.USER_BY_FIREBASE_UID(user.firebaseUid));
	}

	// ==================== UTILITY METHODS ====================

	/**
	 * Check if a key exists in cache
	 */
	async exists(key: string): Promise<boolean> {
		const result = await redis.exists(key);
		return result === 1;
	}

	/**
	 * Set multiple keys at once
	 */
	async mset(entries: Record<string, unknown>, ttl?: number): Promise<void> {
		const pipeline = redis.pipeline();

		for (const [key, value] of Object.entries(entries)) {
			const serialized = JSON.stringify(value);
			if (ttl) {
				pipeline.setex(key, ttl, serialized);
			} else {
				pipeline.set(key, serialized);
			}
		}

		await pipeline.exec();
	}

	/**
	 * Get multiple keys at once
	 */
	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		if (keys.length === 0) return [];

		const values = await redis.mget<string[]>(...keys);

		return values.map((value) => {
			if (!value) return null;
			try {
				return typeof value === "string" ? JSON.parse(value) : value;
			} catch {
				return null;
			}
		});
	}

	/**
	 * Clear all cache (use with caution!)
	 */
	async flushAll(): Promise<void> {
		await redis.flushdb();
	}
}

export const cacheService = new CacheService();
