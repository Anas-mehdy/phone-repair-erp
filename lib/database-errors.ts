export function isDatabaseConnectionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { digest?: string; message?: string; name?: string };

  // Never intercept Next.js redirect or notFound errors
  if (
    err.digest?.includes("NEXT_REDIRECT") ||
    err.message?.includes("NEXT_REDIRECT") ||
    err.digest?.includes("NEXT_NOT_FOUND")
  ) {
    return false;
  }

  const name = err.name || "";
  const message = err.message || "";

  return (
    name.includes("PrismaClientInitializationError") ||
    name.includes("PrismaClientKnownRequestError") ||
    message.includes("Authentication failed") ||
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found") ||
    message.includes("does not exist") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT")
  );
}
