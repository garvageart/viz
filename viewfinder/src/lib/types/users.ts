export type UserRole = "user" | "admin" | "superadmin" | "guest" | undefined;

export interface User {
	uid: string;
	first_name: string;
	last_name: string;
	name: string;
	email: string;
	created_at: Date;
	updated_at: Date;
	role: UserRole;
}
