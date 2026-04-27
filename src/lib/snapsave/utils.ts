import { decodeSnapSave } from "./decode";

export function getEncodedSnapSave(data: string): string[] {
  const encodedBlock = data.split("decodeURIComponent(escape(r))}(")[1];
  if (!encodedBlock) {
    throw new Error("SnapSave response did not include an encoded payload");
  }

  return encodedBlock
    .split("))")[0]
    .split(",")
    .map((v) => v.replace(/"/g, "").trim());
}

export function getDecodedSnapSave(data: string): string {
  const patterns = [
    /getElementById\("download-section"\)\.innerHTML = "([\s\S]*?)";\s*document\.getElementById\("inputData"\)\.remove\(\);\s*/,
    /document\.getElementById\('download-section'\)\.innerHTML = "([\s\S]*?)";\s*document\.getElementById\('inputData'\)\.remove\(\);\s*/,
    /innerHTML\s*=\s*"([\s\S]*?)";\s*document\.getElementById\(["']inputData["']\)\.remove\(\);\s*/,
  ];

  for (const pattern of patterns) {
    const match = data.match(pattern);
    const html = match?.[1];
    if (html) {
      return html.replace(/\\(\\)?/g, "");
    }
  }

  if (/<(?:div|table|figure|a)\b/i.test(data)) {
    return data;
  }

  throw new Error("SnapSave decoded payload did not contain a download section");
}

export function decryptSnapSave(data: string): string {
  const args = getEncodedSnapSave(data);
  const decoded = decodeSnapSave(...args);
  return getDecodedSnapSave(decoded);
}

export function getSnapSaveHtmlCandidates(data: string): string[] {
  const candidates = new Set<string>();

  try {
    candidates.add(decryptSnapSave(data));
  } catch {
    // Ignore decrypt failures and try raw payload fallbacks below.
  }

  addHtmlCandidate(candidates, data);

  const embeddedHtmlPatterns = [
    /"data"\s*:\s*"([\s\S]*?)"/,
    /"html"\s*:\s*"([\s\S]*?)"/,
    /"content"\s*:\s*"([\s\S]*?)"/,
    /innerHTML\s*=\s*"([\s\S]*?)";/,
  ];

  for (const pattern of embeddedHtmlPatterns) {
    const html = data.match(pattern)?.[1];
    if (html) {
      addHtmlCandidate(candidates, html);
    }
  }

  return [...candidates];
}

export function getSnapSaveErrorMessage(data: string): string | undefined {
  const candidates = [data];

  try {
    candidates.unshift(decryptSnapSave(data));
  } catch {
    // Ignore decrypt failures here; raw payload may still contain the message.
  }

  const patterns = [
    /#alert"\)\.innerHTML\s*=\s*"([^"]+)"/,
    /innerHTML\s*=\s*"Error:\s*([^"]+)"/,
    /"message"\s*:\s*"([^"]+)"/,
  ];

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .trim();

    for (const pattern of patterns) {
      const match = normalized.match(pattern)?.[1];
      if (match) {
        return match.startsWith("Error:") ? match : `Error: ${match}`;
      }
    }
  }

  return undefined;
}

function addHtmlCandidate(candidates: Set<string>, value: string) {
  const normalized = value
    .replace(/\\u003C/gi, "<")
    .replace(/\\u003E/gi, ">")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\n/g, "\n")
    .trim();

  if (/<(?:div|table|figure|a|img|video)\b/i.test(normalized)) {
    candidates.add(normalized);
  }
}
