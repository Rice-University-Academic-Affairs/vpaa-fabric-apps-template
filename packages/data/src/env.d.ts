interface ImportMetaEnv {
	readonly DEV?: boolean;
	readonly PROD?: boolean;
	readonly PUBLIC_ADMIN_TEST_MODE?: string;
	readonly PUBLIC_APP_DATA_TEST_MODE?: string;
	readonly VITE_RAYFIN_API_URL?: string;
	readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
	readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
