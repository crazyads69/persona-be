import { z } from "zod";

export const signupSchema = z.object({
	email: z.email("Địa chỉ email không hợp lệ"),
	password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").max(100, "Mật khẩu quá dài"),
	username: z
		.string()
		.min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
		.max(50, "Tên đăng nhập quá dài")
		.regex(/^[a-zA-Z0-9_-]+$/, "Tên đăng nhập chỉ được chứa chữ cái, số, _ và -"),
	displayName: z
		.string()
		.min(1, "Tên hiển thị không được để trống")
		.max(100, "Tên hiển thị quá dài")
		.optional(),
	avatarUrl: z.url("URL ảnh đại diện không hợp lệ").optional(),
	bio: z.string().max(500, "Tiểu sử quá dài").optional(),
});
export type SignupDto = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
	email: z.email("Địa chỉ email không hợp lệ"),
	password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
	displayName: z
		.string()
		.min(1, "Tên hiển thị không được để trống")
		.max(100, "Tên hiển thị quá dài")
		.optional(),
	avatarUrl: z.url("URL ảnh đại diện không hợp lệ").optional(),
	bio: z.string().max(500, "Tiểu sử quá dài").optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
	newPassword: z
		.string()
		.min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
		.max(100, "Mật khẩu mới quá dài"),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
	email: z.email("Địa chỉ email không hợp lệ"),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const userResponseSchema = z.object({
	id: z.string(),
	firebaseUid: z.string(),
	email: z.email(),
	username: z.string(),
	displayName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
	bio: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
