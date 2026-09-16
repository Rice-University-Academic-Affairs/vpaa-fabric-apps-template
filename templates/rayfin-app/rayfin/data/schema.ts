import { AdminUser } from "./core/AdminUser.js";

export type AppSchema = {
	AdminUser: AdminUser;
};

export const coreEntities = [AdminUser] as const;

export const schema = [...coreEntities] as const;
