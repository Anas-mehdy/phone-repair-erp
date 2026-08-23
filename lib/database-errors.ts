export function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name.includes("PrismaClientInitializationError") ||
    error.message.includes("Authentication failed") ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("Environment variable not found") ||
    error.message.includes("does not exist")
  );
}
