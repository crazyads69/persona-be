import "dotenv/config";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { getEnvOrThrow } from "./utils";

const app = new Hono().basePath("/api/v1");

app.use(clerkMiddleware());

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

export default {
	port: getEnvOrThrow("PORT"),
	fetch: app.fetch,
};
