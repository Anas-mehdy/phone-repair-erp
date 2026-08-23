import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب ألا يقل عن حرفين"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  shopName: z.string().min(2, "اسم المتجر يجب ألا يقل عن حرفين"),
  phone: z.string().optional().default(""),
  currency: z.string().default("SAR"),
  address: z.string().optional().default(""),
});

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const authService = {
  async registerShop(input: RegisterInput) {
    const validated = registerSchema.parse(input);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: validated.email.toLowerCase().trim(),
      },
    });

    if (existingUser) {
      throw new Error("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.");
    }

    const passwordHash = await hashPassword(validated.password);

    // Create shop and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: validated.shopName.trim(),
          phone: validated.phone?.trim() || null,
          currency: validated.currency.trim() || "SAR",
          address: validated.address?.trim() || null,
          taxRate: 15,
        },
      });

      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          email: validated.email.toLowerCase().trim(),
          name: validated.name.trim(),
          passwordHash,
          role: "OWNER",
        },
      });

      return { shop, user };
    });

    // Set session cookie
    await setSessionCookie({
      userId: result.user.id,
      shopId: result.shop.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      shopName: result.shop.name,
      currency: result.shop.currency,
    });

    return result;
  },

  async loginUser(input: LoginInput) {
    const validated = loginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: {
        email: validated.email.toLowerCase().trim(),
        deletedAt: null,
      },
      include: {
        shop: true,
      },
    });

    if (!user || !user.shop || user.shop.deletedAt !== null) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    if (!user.passwordHash) {
      throw new Error("الحساب بحاجة لتعيين كلمة مرور جديدة");
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    // Set session cookie
    await setSessionCookie({
      userId: user.id,
      shopId: user.shop.id,
      email: user.email,
      name: user.name,
      role: user.role,
      shopName: user.shop.name,
      currency: user.shop.currency,
    });

    return { user, shop: user.shop };
  },

  async logout() {
    await clearSessionCookie();
  },

  async getCurrentSession() {
    return getSession();
  },
};
