import { buildAppUrl } from "@/lib/app-url";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const from = process.env.RESEND_FROM_EMAIL || "مسار <security@auth.massarerp.com>";
  const resetUrl = buildAppUrl(`/reset-password?token=${encodeURIComponent(input.token)}`);
  const safeName = escapeHtml(input.name);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "إعادة تعيين كلمة المرور في مسار",
      text: `مرحباً ${input.name}، طلبت إعادة تعيين كلمة المرور في مسار. افتح الرابط التالي خلال 15 دقيقة: ${resetUrl}\n\nإذا لم تطلب ذلك، تجاهل الرسالة.`,
      html: `
        <div dir="rtl" style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0f766e,#0891b2);padding:24px;color:#fff">
              <div style="font-size:24px;font-weight:800">مسار</div>
              <div style="margin-top:4px;font-size:13px;opacity:.9">منظومة إدارة صيانة الهواتف</div>
            </div>
            <div style="padding:28px">
              <h1 style="font-size:20px;margin:0 0 16px">إعادة تعيين كلمة المرور</h1>
              <p style="font-size:14px;line-height:1.9;margin:0 0 22px">مرحباً ${safeName}، تلقّينا طلباً لتغيير كلمة المرور الخاصة بحسابك في مسار.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:13px 24px;border-radius:12px;font-size:14px;font-weight:700">تعيين كلمة مرور جديدة</a>
              <p style="font-size:12px;line-height:1.8;color:#64748b;margin:22px 0 0">الرابط صالح لمدة 15 دقيقة ويُستخدم مرة واحدة فقط. إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة ولن يتغير حسابك.</p>
            </div>
          </div>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected password email (${response.status}): ${detail.slice(0, 300)}`);
  }
}
