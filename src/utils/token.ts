export function obfuscateToken(
  token: string,
  visibleChars: number | { start: number; end: number } = 4
): string {
  // Determine the number of visible characters at the start and end
  let startVisible: number, endVisible: number;
  if (typeof visibleChars === "number") {
    // If it's a single number, use it for both start and end
    startVisible = visibleChars;
    endVisible = visibleChars;
  } else {
    // If it's an object, use the specified start and end values
    startVisible = visibleChars.start;
    endVisible = visibleChars.end;
  }

  // If the token is too short to obfuscate, return the full token
  if (token.length <= startVisible + endVisible) {
    return token;
  }

  // Extract the visible parts (first `startVisible` and last `endVisible` characters)
  const visibleStart = token.slice(0, startVisible);
  const visibleEnd = token.slice(-endVisible);

  // Replace the middle part of the token with asterisks
  const obfuscatedPart = "*".repeat(token.length - startVisible - endVisible);

  return visibleStart + obfuscatedPart + visibleEnd;
}
