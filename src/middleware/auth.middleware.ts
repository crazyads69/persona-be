import type { Context, Next } from "hono";
import { authService } from "../services/auth.service";
import { errorResponse } from "../shared/response";

// Extend Hono context with user
declare module "hono" {
	interface ContextVariableMap {
		user: {
			id: string;
			firebaseUid: string;
			email: string;
			username: string;
		};
	}
}

/**
 * Authentication middleware
 * Verifies Firebase ID token and attaches user to context
 */
export async function authMiddleware(c: Context, next: Next) {
	try {
		const authHeader = c.req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return errorResponse(c, "Token xác thực không hợp lệ", 401);
		}

		const idToken = authHeader.replace("Bearer ", "");

		try {
			const user = await authService.verifyToken(idToken);

			// Attach user to context
			c.set("user", {
				id: user.id,
				firebaseUid: user.firebaseUid,
				email: user.email,
				username: user.username,
			});

			await next();
		} catch (error: unknown) {
			if (error instanceof Error) {
				return errorResponse(c, error.message, 401);
			}
			return errorResponse(c, "Token không hợp lệ", 401);
		}
	} catch (_error) {
		return errorResponse(c, "Lỗi xác thực", 401);
	}
}

/**
 * Optional authentication middleware
 * Attaches user to context if token is present, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (authHeader?.startsWith("Bearer ")) {
		const idToken = authHeader.replace("Bearer ", "");

		try {
			const user = await authService.verifyToken(idToken);

			c.set("user", {
				id: user.id,
				firebaseUid: user.firebaseUid,
				email: user.email,
				username: user.username,
			});
		} catch (error) {
			// Silently fail for optional auth
			console.error("Optional auth failed:", error);
		}
	}

	await next();
}
