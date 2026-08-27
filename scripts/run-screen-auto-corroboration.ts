import { prisma } from "../lib/prisma";
import { screenAutoCorroborationService } from "../lib/services/compatibility/screen-auto-corroboration.service";

async function main() {
  const result = await screenAutoCorroborationService.run();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
