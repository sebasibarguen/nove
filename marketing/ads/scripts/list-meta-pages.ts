// ABOUTME: Lists Facebook Pages accessible to the system user token.
// ABOUTME: Run with: npx tsx ads/scripts/list-meta-pages.ts — prints id + name for each.

import { metaGet } from "./lib/meta-api";

interface PageEntry {
  id: string;
  name: string;
  tasks?: string[];
}

async function main(): Promise<void> {
  if (!process.env.META_ACCESS_TOKEN) {
    console.error("META_ACCESS_TOKEN is required");
    process.exit(1);
  }

  const result = await metaGet<{ data: PageEntry[] }>("me/accounts", {
    fields: "id,name,tasks",
    limit: "100",
  });

  if (result.data.length === 0) {
    console.log("No Pages accessible to this token.");
    console.log("");
    console.log("Make sure you've added the Page as a system user asset in Business Manager:");
    console.log("  Business Settings → Users → System Users → your-user → Add Assets → Pages");
    return;
  }

  console.log(`Pages accessible to your token (${result.data.length}):`);
  console.log("");
  for (const p of result.data) {
    console.log(`  ${p.name}`);
    console.log(`    id:    ${p.id}`);
    if (p.tasks?.length) console.log(`    tasks: ${p.tasks.join(", ")}`);
    console.log("");
  }
  console.log("Add the right id to .env as META_PAGE_ID, then run deploy-meta.ts.");
}

main().catch((err) => {
  console.error("List failed:", err.message);
  process.exit(1);
});
