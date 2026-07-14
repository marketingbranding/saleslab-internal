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
}]);
