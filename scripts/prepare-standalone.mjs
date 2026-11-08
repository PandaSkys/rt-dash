// Le build standalone ne contient ni les fichiers statiques ni public/ :
// on les copie à côté de server.js, comme le fait le Dockerfile.
import { cpSync, existsSync } from "node:fs";

const STANDALONE_DIR = ".next/standalone";

cpSync(".next/static", `${STANDALONE_DIR}/.next/static`, { recursive: true });
if (existsSync("public")) {
  cpSync("public", `${STANDALONE_DIR}/public`, { recursive: true });
}
