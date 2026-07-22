import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...next],
}, {
    files: ["app/page.tsx", "components/AdminPanel.tsx", "components/SyncIndicator.tsx"],
    rules: {
        "react-hooks/set-state-in-effect": "off",
    },
}, {
    files: ["hooks/useFrustration.ts"],
    rules: {
        "react-hooks/refs": "off",
    },
}, {
    files: ["app/page.tsx", "components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "lib/AuthContext.tsx"],
    rules: {
        "no-restricted-imports": ["error", {
            paths: ["postgres", "drizzle-orm", "drizzle-orm/postgres-js"],
            patterns: ["drizzle-orm/*", "@/lib/server/postgres/*", "../lib/server/postgres/*", "../../lib/server/postgres/*"],
        }],
    },
}]);
