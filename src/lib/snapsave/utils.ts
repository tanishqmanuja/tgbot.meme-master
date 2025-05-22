import { decodeSnapSave } from "./decode";

export function getEncodedSnapSave(data: string): string[] {
  return data
    .split("decodeURIComponent(escape(r))}(")[1]
    .split("))")[0]
    .split(",")
    .map((v) => v.replace(/"/g, "").trim());
}

export function getDecodedSnapSave(data: string): string {
  return data
    .split('getElementById("download-section").innerHTML = "')[1]
    .split('"; document.getElementById("inputData").remove(); ')[0]
    .replace(/\\(\\)?/g, "");
}

export function decryptSnapSave(data: string): string {
  const args = getEncodedSnapSave(data);
  const decoded = decodeSnapSave(...args);
  return getDecodedSnapSave(decoded);
}
