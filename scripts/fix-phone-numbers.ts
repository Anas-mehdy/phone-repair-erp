import { prisma } from "../lib/prisma";
import { normalizePhoneForWhatsApp } from "../lib/services/whatsappService";

async function main() {
  console.log("=== بدء فحص وتصحيح أرقام الهواتف الحالية ===");

  // 1. Fix Shop phones
  const shops = await prisma.shop.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      currency: true,
    },
  });

  console.log(`تم العثور على ${shops.length} متجر للفحص.`);

  let shopsUpdated = 0;
  for (const shop of shops) {
    if (!shop.phone) continue;

    const normalized = normalizePhoneForWhatsApp(shop.phone, shop.currency);
    if (normalized) {
      const formatted = `+${normalized}`;
      if (shop.phone !== formatted && shop.phone !== normalized) {
        console.log(`[Shop] تحديث رقم متجر "${shop.name}": ${shop.phone} => ${formatted} (العملة: ${shop.currency})`);
        await prisma.shop.update({
          where: { id: shop.id },
          data: { phone: formatted },
        });
        shopsUpdated++;
      }
    }
  }

  // 2. Fix Customer phones
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      shop: {
        select: {
          currency: true,
        },
      },
    },
  });

  console.log(`تم العثور على ${customers.length} عميل للفحص.`);

  let customersUpdated = 0;
  for (const customer of customers) {
    if (!customer.phone) continue;

    const shopCurrency = customer.shop?.currency || "SAR";
    const normalized = normalizePhoneForWhatsApp(customer.phone, shopCurrency);
    if (normalized) {
      const formatted = `+${normalized}`;
      if (customer.phoneNormalized !== formatted && customer.phoneNormalized !== normalized) {
        console.log(`[Customer] تحديث رقم العميل "${customer.name}": ${customer.phone} => ${formatted}`);
        await prisma.customer.update({
          where: { id: customer.id },
          data: { phoneNormalized: formatted },
        });
        customersUpdated++;
      }
    }
  }

  console.log(`=== اكتمل التحديث بنجاح! تم تصحيح ${shopsUpdated} متجر و ${customersUpdated} عميل ===`);
}

main()
  .catch((err) => {
    console.error("حدث خطأ أثناء تصحيح البيانات:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
