interface ImportMetaEnv {
	readonly DEV?: boolean;
	readonly PROD?: boolean;
	readonly PUBLIC_ADMIN_TEST_MODE?: string;
	readonly PUBLIC_OWNER_ADMIN_EMAIL?: string;
	readonly VITE_OWNER_ADMIN_EMAIL?: string;
	readonly VITE_RAYFIN_API_URL?: string;
	readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
	readonly VITE_FABRIC_WORKSPACE_ID?: string;
	readonly VITE_FABRIC_ITEM_ID?: string;
	readonly VITE_FABRIC_PORTAL_URL?: string;
	readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
