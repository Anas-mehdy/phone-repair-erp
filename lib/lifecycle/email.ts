import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { createLifecycleUnsubscribeToken } from "@/lib/lifecycle/unsubscribe-token";
import { buildLifecycleEmailContent } from "@/lib/lifecycle/templates";
import type { LifecycleDecision } from "@/lib/lifecycle/rules";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function lifecycleEmailDeliveryEnabled() {
  return process.env.GROWTH_LIFECYCLE_EMAILS_ENABLED?.trim().toLowerCase() === "true";
}

export async function sendLifecycleEmail(input: {
  shopId: string;
  email: string;
  ownerName: string;
  shopName: string;
  decision: LifecycleDecision;
}) {
  if (!lifecycleEmailDeliveryEnabled()) {
    throw new Error("Lifecycle email delivery is disabled.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const content = buildLifecycleEmailContent(input.decision);
  const from = process.env.GROWTH_LIFECYCLE_FROM_EMAIL?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || "مسار <security@auth.massarerp.com>";
  const ctaUrl = buildAppUrl(content.ctaPath);
  const unsubscribeToken = createLifecycleUnsubscribeToken(input.shopId);
  const unsubscribeUrl = buildAppUrl(`/email-preferences/lifecycle?token=${encodeURIComponent(unsubscribeToken)}`);
  const safeOwner = escapeHtml(input.ownerName);
  const safeShop = escapeHtml(input.shopName);
  const safeHeading = escapeHtml(content.heading);
  const safeBody = escapeHtml(content.body);
  const safeFootnote = escapeHtml(content.footnote);
  const safeCta = escapeHtml(content.ctaLabel);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: content.subject,
      text: `مرحباً ${input.ownerName}،\n\n${content.heading}\n${content.body}\n\n${content.ctaLabel}: ${ctaUrl}\n\n${content.footnote}\n\nإيقاف رسائل تفعيل الاستخدام: ${unsubscribeUrl}`,
      html: `
        <div dir="rtl" style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:580px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0f766e,#0891b2);padding:24px;color:#fff">
              <div style="font-size:24px;font-weight:800">مسار</div>
              <div style="margin-top:5px;font-size:12px;opacity:.9">${safeShop}</div>
            </div>
            <div style="padding:28px">
              <p style="font-size:14px;line-height:1.9;margin:0 0 10px">مرحباً ${safeOwner}،</p>
              <h1 style="font-size:20px;margin:0 0 14px">${safeHeading}</h1>
              <p style="font-size:14px;line-height:1.95;margin:0 0 22px;color:#334155">${safeBody}</p>
              <a href="${ctaUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:700">${safeCta}</a>
              <p style="font-size:12px;line-height:1.8;color:#64748b;margin:20px 0 0">${safeFootnote}</p>
            </div>
            <div style="border-top:1px solid #e2e8f0;padding:18px 28px;font-size:11px;line-height:1.8;color:#94a3b8">
              هذه الرسائل تساعدك على إكمال تجربة مسار بناءً على استخدام حسابك. رسائل الأمان مثل إعادة تعيين كلمة المرور لا تتأثر.
              <br /><a href="${unsubscribeUrl}" style="color:#64748b">إيقاف رسائل تفعيل الاستخدام</a>
            </div>
          </div>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected lifecycle email (${response.status}): ${detail.slice(0, 240)}`);
  }

  const payload = await response.json().catch(() => ({})) as { id?: string };
  return { providerMessageId: payload.id ?? null };
}
