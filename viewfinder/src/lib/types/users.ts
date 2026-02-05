export type UserRole = "user" | "admin" | "superadmin" | "guest";

export interface User {
    uid: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    role: UserRole;
}