import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { env } from "./config";
import authRoutes from "./routes/auth.routes";
import internalRoutes from "./routes/internal.routes";
import { errorResponse } from "./shared/response";

const app = new Hono().basePath("/api/v1");

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
	"*",
	cors({
		origin: "*", // Configure this properly in production
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

// Error handler
app.onError((err, c) => {
	console.error("Application error:", err);
	return errorResponse(c, err.message || "Internal Server Error", 500);
});

// Routes
app.route("/auth", authRoutes);
app.route("/internal", internalRoutes);

// Health check
app.get("/", (c) => {
	return c.json({
		name: "Persona Backend API",
		version: "1.0.0",
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});

// 404 handler
app.notFound((c) => {
	return errorResponse(c, "Route not found", 404);
});

console.log(`🚀 Server starting on port ${env.PORT}`);
console.log(`🔗 API Base URL: ${env.API_BASE_URL}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
};
