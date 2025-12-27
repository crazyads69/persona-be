import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
	changePasswordSchema,
	loginSchema,
	resetPasswordSchema,
	signupSchema,
	updateProfileSchema,
} from "../dto/auth.dto";
import { authMiddleware } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";
import { errorResponse, successResponse } from "../shared/response";

const authRoutes = new Hono();

/**
 * POST /auth/signup
 * Register a new user
 */
authRoutes.post("/signup", zValidator("json", signupSchema), async (c) => {
	try {
		const dto = c.req.valid("json");
		const user = await authService.signup(dto);

		return successResponse(c, user, "Đăng ký thành công", 201);
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 400);
		}
		return errorResponse(c, "Đăng ký thất bại", 400);
	}
});

/**
 * POST /auth/login
 * Login user (verify credentials and return user data)
 */
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
	try {
		const dto = c.req.valid("json");
		const user = await authService.login(dto);

		return successResponse(c, user, "Đăng nhập thành công");
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 401);
		}
		return errorResponse(c, "Đăng nhập thất bại", 401);
	}
});

/**
 * GET /auth/me
 * Get current user profile (protected)
 */
authRoutes.get("/me", authMiddleware, async (c) => {
	try {
		const { id } = c.get("user");
		const user = await authService.getProfile(id);

		return successResponse(c, user);
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 404);
		}
		return errorResponse(c, "Không tìm thấy người dùng", 404);
	}
});

/**
 * PATCH /auth/profile
 * Update user profile (protected)
 */
authRoutes.patch("/profile", authMiddleware, zValidator("json", updateProfileSchema), async (c) => {
	try {
		const { id } = c.get("user");
		const dto = c.req.valid("json");
		const user = await authService.updateProfile(id, dto);

		return successResponse(c, user, "Cập nhật hồ sơ thành công");
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 400);
		}
		return errorResponse(c, "Cập nhật hồ sơ thất bại", 400);
	}
});

/**
 * POST /auth/change-password
 * Change user password (protected)
 */
authRoutes.post(
	"/change-password",
	authMiddleware,
	zValidator("json", changePasswordSchema),
	async (c) => {
		try {
			const { id } = c.get("user");
			const dto = c.req.valid("json");
			await authService.changePassword(id, dto);

			return successResponse(c, null, "Đổi mật khẩu thành công");
		} catch (error: unknown) {
			if (error instanceof Error) {
				return errorResponse(c, error.message, 400);
			}
			return errorResponse(c, "Đổi mật khẩu thất bại", 400);
		}
	}
);

/**
 * POST /auth/reset-password
 * Request password reset email
 */
authRoutes.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
	try {
		const { email } = c.req.valid("json");
		await authService.resetPassword(email);

		return successResponse(c, null, "Email đặt lại mật khẩu đã được gửi");
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 400);
		}
		return errorResponse(c, "Gửi email thất bại", 400);
	}
});

/**
 * DELETE /auth/account
 * Delete user account (protected)
 */
authRoutes.delete("/account", authMiddleware, async (c) => {
	try {
		const { id } = c.get("user");
		await authService.deleteAccount(id);

		return successResponse(c, null, "Xóa tài khoản thành công");
	} catch (error: unknown) {
		if (error instanceof Error) {
			return errorResponse(c, error.message, 400);
		}
		return errorResponse(c, "Xóa tài khoản thất bại", 400);
	}
});

export default authRoutes;
