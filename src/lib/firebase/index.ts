import admin from "firebase-admin";
import { env } from "../../config";

if (!admin.apps.length) {
	const _serviceAccount = JSON.parse(
		Buffer.from(env.FIREBASE_ADMIN_CREDENTIAL, "base64").toString("utf-8")
	);

	admin.initializeApp({
		credential: admin.credential.cert(_serviceAccount),
	});
}

export const auth = admin.auth();
export const firebaseAdmin = admin;
