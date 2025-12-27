// Check env value exist if has return the value else throw error

export function getEnvOrThrow(envVar: string): string {
	const value = process.env[envVar];
	if (!value) {
		throw new Error(`${envVar} is required`);
	}
	return value;
}
