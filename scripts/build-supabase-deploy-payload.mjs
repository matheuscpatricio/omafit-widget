import fs from "node:fs";
import path from "node:path";

const root = path.resolve("supabase/functions");

const bundles = {
  "shopify-app-uninstalled-webhook": [
    "shopify-app-uninstalled-webhook/index.ts",
    "_shared/shopify-uninstall-email.ts",
    "_shared/shopify-uninstall-templates.ts",
    "_shared/shopify-webhook-verify.ts",
    "_shared/zoho-mail.ts",
    "_shared/locale-from-country.ts",
  ],
  "shopify-uninstall-email": [
    "shopify-uninstall-email/index.ts",
    "_shared/shopify-uninstall-email.ts",
    "_shared/shopify-uninstall-templates.ts",
    "_shared/zoho-mail.ts",
    "_shared/locale-from-country.ts",
  ],
};

for (const [name, files] of Object.entries(bundles)) {
  const payload = {
    project_id: "lhkgnirolvbmomeduoaj",
    name,
    entrypoint_path: `supabase/functions/${files[0]}`,
    verify_jwt: false,
    files: files.map((file) => ({
      name: `supabase/functions/${file}`,
      content: fs.readFileSync(path.join(root, file), "utf8"),
    })),
  };

  fs.writeFileSync(
    path.resolve(`scripts/deploy-payload-${name}.json`),
    JSON.stringify(payload),
  );
  console.log(`wrote deploy-payload-${name}.json (${payload.files.length} files)`);
}
