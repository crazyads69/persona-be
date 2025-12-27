import { Hono } from "hono";
import { env } from "./config";

const app = new Hono().basePath("/api/v1");

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

export default {
	port: env.PORT,
	fetch: app.fetch,
};
