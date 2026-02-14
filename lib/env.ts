export function isRunningLocally(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

export function isDeployed(): boolean {
  return !isRunningLocally();
}
