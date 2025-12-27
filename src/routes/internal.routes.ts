import { Hono } from "hono";
import type { WriteJobPayload } from "../lib/qstash";
import { verifyQStashSignature } from "../lib/qstash";
import { dbService } from "../services/db.service";
import { errorResponse, successResponse } from "../shared/response";

const internalRoutes = new Hono();

/**
 * POST /internal/sync-to-db
 * QStash callback endpoint to sync data from Redis to Turso
 * This endpoint is called by QStash with the write job payload
 */
internalRoutes.post("/sync-to-db", async (c) => {
	try {
		// Verify QStash signature
		const signature = c.req.header("Upstash-Signature");
		if (!signature) {
			return errorResponse(c, "Missing QStash signature", 401);
		}

		const body = await c.req.text();
		const isValid = await verifyQStashSignature(signature, body);

		if (!isValid) {
			return errorResponse(c, "Invalid QStash signature", 401);
		}

		// Parse the job payload
		const payload: WriteJobPayload = JSON.parse(body);

		// Process the write job
		await dbService.processWriteJob(payload);

		return successResponse(c, { jobId: payload.id }, "Write job processed successfully");
	} catch (error: unknown) {
		console.error("Failed to process write job:", error);
		if (error instanceof Error) {
			return errorResponse(c, error.message, 500);
		}
		return errorResponse(c, "Failed to process write job", 500);
	}
});

/**
 * POST /internal/batch-sync
 * Process multiple write jobs in batch
 */
internalRoutes.post("/batch-sync", async (c) => {
	try {
		// Verify QStash signature
		const signature = c.req.header("Upstash-Signature");
		if (!signature) {
			return errorResponse(c, "Missing QStash signature", 401);
		}

		const body = await c.req.text();
		const isValid = await verifyQStashSignature(signature, body);

		if (!isValid) {
			return errorResponse(c, "Invalid QStash signature", 401);
		}

		// Parse the batch payload
		const payloads: WriteJobPayload[] = JSON.parse(body);

		// Process all jobs
		await dbService.batchProcessJobs(payloads);

		return successResponse(
			c,
			{ count: payloads.length },
			`Batch processed ${payloads.length} jobs`
		);
	} catch (error: unknown) {
		console.error("Failed to process batch:", error);
		if (error instanceof Error) {
			return errorResponse(c, error.message, 500);
		}
		return errorResponse(c, "Failed to process batch", 500);
	}
});

/**
 * GET /internal/health
 * Health check endpoint
 */
internalRoutes.get("/health", (c) => {
	return successResponse(c, {
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});

export default internalRoutes;
