import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db } from "../db";
import type { NewUser, User } from "../db/schema";
import { users } from "../db/schema";
import type {
	ChangePasswordDto,
	LoginDto,
	SignupDto,
	UpdateProfileDto,
	UserResponse,
} from "../dto/auth.dto";
import { auth } from "../lib/firebase";
import { cacheService } from "./cache.service";

/**
 * Authentication Service
 * Handles user authentication with Firebase and write-behind caching
 */
export class AuthService {
	/**
	 * Register a new user
	 */
	async signup(dto: SignupDto): Promise<UserResponse> {
		// Check if user already exists in cache
		const existingByEmail = await cacheService.getUserByEmail(dto.email);
		if (existingByEmail) {
			throw new Error("Email đã được sử dụng");
		}

		const existingByUsername = await cacheService.getUserByUsername(dto.username);
		if (existingByUsername) {
			throw new Error("Tên đăng nhập đã được sử dụng");
		}

		// Also check database as fallback
		const dbExistingEmail = await db.query.users.findFirst({
			where: eq(users.email, dto.email),
		});
		if (dbExistingEmail) {
			throw new Error("Email đã được sử dụng");
		}

		const dbExistingUsername = await db.query.users.findFirst({
			where: eq(users.username, dto.username),
		});
		if (dbExistingUsername) {
			throw new Error("Tên đăng nhập đã được sử dụng");
		}

		try {
			// Create Firebase user
			const firebaseUser = await auth.createUser({
				email: dto.email,
				password: dto.password,
				displayName: dto.displayName || dto.username,
				photoURL: dto.avatarUrl,
			});

			// Create user record in cache (will be synced to DB via QStash)
			const newUser: NewUser = {
				id: uuidv7(),
				firebaseUid: firebaseUser.uid,
				email: dto.email,
				username: dto.username,
				displayName: dto.displayName || dto.username,
				avatarUrl: dto.avatarUrl || null,
				bio: dto.bio || null,
			};

			const user = await cacheService.createUser(newUser);

			return this.toUserResponse(user);
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (error.message.includes("email")) {
					throw new Error("Email đã được sử dụng");
				}
				throw new Error(`Đăng ký thất bại: ${error.message}`);
			}
			throw new Error("Đăng ký thất bại");
		}
	}

	/**
	 * Login user (verify Firebase token)
	 */
	async login(dto: LoginDto): Promise<UserResponse> {
		try {
			// Get user by email from Firebase
			const firebaseUser = await auth.getUserByEmail(dto.email);

			// Try to get user from cache first
			let user = await cacheService.getUserByFirebaseUid(firebaseUser.uid);

			// If not in cache, fetch from database and cache it
			if (!user) {
				const dbUser = await db.query.users.findFirst({
					where: eq(users.firebaseUid, firebaseUser.uid),
				});

				if (!dbUser) {
					throw new Error("Người dùng không tồn tại");
				}

				user = dbUser;
				// Cache the user for future requests
				await cacheService.createUser(user);
			}

			return this.toUserResponse(user);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Đăng nhập thất bại: ${error.message}`);
			}
			throw new Error("Đăng nhập thất bại");
		}
	}

	/**
	 * Verify Firebase ID token and return user
	 */
	async verifyToken(idToken: string): Promise<User> {
		try {
			const decodedToken = await auth.verifyIdToken(idToken);
			const firebaseUid = decodedToken.uid;

			// Try cache first
			let user = await cacheService.getUserByFirebaseUid(firebaseUid);

			// If not in cache, fetch from database
			if (!user) {
				const dbUser = await db.query.users.findFirst({
					where: eq(users.firebaseUid, firebaseUid),
				});

				if (!dbUser) {
					throw new Error("Người dùng không tồn tại");
				}

				user = dbUser;
				// Cache for future requests
				await cacheService.createUser(user);
			}

			return user;
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Token không hợp lệ: ${error.message}`);
			}
			throw new Error("Token không hợp lệ");
		}
	}

	/**
	 * Get user profile
	 */
	async getProfile(userId: string): Promise<UserResponse> {
		// Try cache first
		let user = await cacheService.getUser(userId);

		// If not in cache, fetch from database
		if (!user) {
			const dbUser = await db.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!dbUser) {
				throw new Error("Người dùng không tồn tại");
			}

			user = dbUser;
			// Cache for future requests
			await cacheService.createUser(user);
		}

		return this.toUserResponse(user);
	}

	/**
	 * Update user profile
	 */
	async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
		const updatedUser = await cacheService.updateUser(userId, dto);

		if (!updatedUser) {
			throw new Error("Người dùng không tồn tại");
		}

		// Also update Firebase profile
		try {
			const user = await cacheService.getUser(userId);
			if (user) {
				await auth.updateUser(user.firebaseUid, {
					displayName: dto.displayName,
					photoURL: dto.avatarUrl,
				});
			}
		} catch (error) {
			console.error("Failed to update Firebase profile:", error);
			// Don't throw error as the main update succeeded
		}

		return this.toUserResponse(updatedUser);
	}

	/**
	 * Change user password
	 */
	async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
		const user = await cacheService.getUser(userId);

		if (!user) {
			throw new Error("Người dùng không tồn tại");
		}

		try {
			await auth.updateUser(user.firebaseUid, {
				password: dto.newPassword,
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Đổi mật khẩu thất bại: ${error.message}`);
			}
			throw new Error("Đổi mật khẩu thất bại");
		}
	}

	/**
	 * Request password reset email
	 */
	async resetPassword(email: string): Promise<void> {
		try {
			const link = await auth.generatePasswordResetLink(email);
			// In production, send this link via email
			console.log(`Password reset link: ${link}`);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Gửi email đặt lại mật khẩu thất bại: ${error.message}`);
			}
			throw new Error("Gửi email đặt lại mật khẩu thất bại");
		}
	}

	/**
	 * Delete user account
	 */
	async deleteAccount(userId: string): Promise<void> {
		const user = await cacheService.getUser(userId);

		if (!user) {
			throw new Error("Người dùng không tồn tại");
		}

		try {
			// Delete from Firebase
			await auth.deleteUser(user.firebaseUid);

			// Soft delete from cache (will sync to DB)
			await cacheService.deleteUser(userId);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Xóa tài khoản thất bại: ${error.message}`);
			}
			throw new Error("Xóa tài khoản thất bại");
		}
	}

	/**
	 * Convert User to UserResponse
	 */
	private toUserResponse(user: User): UserResponse {
		return {
			id: user.id,
			firebaseUid: user.firebaseUid,
			email: user.email,
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl,
			bio: user.bio,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}
}

export const authService = new AuthService();
