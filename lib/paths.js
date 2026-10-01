import path from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the package root. */
export const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
