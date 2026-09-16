import { AdminUser } from "./core/AdminUser.js";
import { Faculty } from "./fixtures/Faculty.js";
import { FacultyAward } from "./fixtures/FacultyAward.js";
import { Product } from "./fixtures/Product.js";
import { ProductCategory } from "./fixtures/ProductCategory.js";
import { ResearchGrant } from "./fixtures/ResearchGrant.js";
import { SabbaticalCredit } from "./fixtures/SabbaticalCredit.js";

export type AppSchema = {
	AdminUser: AdminUser;
	Faculty: Faculty;
	FacultyAward: FacultyAward;
	Product: Product;
	ProductCategory: ProductCategory;
	ResearchGrant: ResearchGrant;
	SabbaticalCredit: SabbaticalCredit;
};

export const coreEntities = [AdminUser] as const;

export const fixtureEntities = [
	Product,
	ProductCategory,
	Faculty,
	FacultyAward,
	ResearchGrant,
	SabbaticalCredit
] as const;

export const schema = [...coreEntities, ...fixtureEntities] as const;
