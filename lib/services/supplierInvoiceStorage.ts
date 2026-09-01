const BUCKET = "supplier-invoices";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function getStorageConfig() {
  const baseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error(
      "تخزين مرفقات فواتير الموردين غير مهيأ. أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY إلى متغيرات البيئة.",
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), serviceRoleKey };
}

function extensionFor(file: File) {
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return mimeMap[file.type] ?? "bin";
}

export function validateSupplierInvoiceReference(file: File | null) {
  if (!file || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("حجم ملف الفاتورة يجب ألا يتجاوز 4 ميغابايت.");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("المسموح فقط: JPG أو PNG أو WEBP أو PDF.");
  }
}

export type StoredSupplierInvoiceReference = {
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

export async function uploadSupplierInvoiceReference(
  shopId: string,
  invoiceId: string,
  file: File,
): Promise<StoredSupplierInvoiceReference> {
  validateSupplierInvoiceReference(file);
  const { baseUrl, serviceRoleKey } = getStorageConfig();
  const path = `${shopId}/${invoiceId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Supplier invoice attachment upload failed", response.status, details);
    throw new Error("تعذر رفع ملف الفاتورة. حاول مجدداً.");
  }

  return {
    path,
    name: file.name || `invoice.${extensionFor(file)}`,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteSupplierInvoiceReference(path: string) {
  try {
    const { baseUrl, serviceRoleKey } = getStorageConfig();
    await fetch(`${baseUrl}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [path] }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to cleanup supplier invoice attachment", error);
  }
}

export async function fetchSupplierInvoiceReference(path: string) {
  const { baseUrl, serviceRoleKey } = getStorageConfig();
  return fetch(
    `${baseUrl}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      cache: "no-store",
    },
  );
}
