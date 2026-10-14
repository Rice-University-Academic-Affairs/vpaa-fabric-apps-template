import { AdminUser } from "./core/AdminUser.js";
import { domainEntities, type DomainSchema } from "./domain/entities.generated.js";

export type AppSchema = {
	AdminUser: AdminUser;
} & DomainSchema;

export const coreEntities = [AdminUser] as const;

export const schema = [...coreEntities, ...domainEntities] as const;
