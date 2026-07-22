import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (process.env[key]) continue;
    process.env[key] = match[2]
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Load seed HTML via compiled path workaround: read generated HTML files
const nda = readFileSync("content/developer-agreements/nda-v1.html", "utf8");
const ip = readFileSync("content/developer-agreements/ip-v1.html", "utf8");

const seeds = [
  {
    slug: "nda",
    title: "Non-Disclosure Agreement (NDA)",
    description:
      "Protects Hey Ralli's confidential business, technical, customer, and product information.",
    versionLabel: "NDA-2026-01",
    documentNumber: "HR-LGL-001",
    sortOrder: 1,
    bodyHtml: nda,
  },
  {
    slug: "ip-assignment",
    title: "Intellectual Property Assignment",
    description:
      "Assigns work product and proprietary rights created for Hey Ralli to Hey Ralli, LLC.",
    versionLabel: "IP-2026-01",
    documentNumber: "HR-LGL-002",
    sortOrder: 2,
    bodyHtml: ip,
  },
];

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count, error: countError } = await admin
  .from("developer_agreement_documents")
  .select("id", { count: "exact", head: true });

if (countError) {
  console.error(countError.message);
  process.exit(1);
}

if ((count ?? 0) > 0) {
  console.log("Already seeded:", count);
  process.exit(0);
}

for (const seed of seeds) {
  const { data: document, error: docError } = await admin
    .from("developer_agreement_documents")
    .insert({
      slug: seed.slug,
      title: seed.title,
      description: seed.description,
      document_number: seed.documentNumber,
      sort_order: seed.sortOrder,
      required_for_roles: ["developer"],
      is_active: true,
    })
    .select("id")
    .single();

  if (docError || !document) {
    console.error(docError?.message ?? "document insert failed");
    process.exit(1);
  }

  const { data: version, error: versionError } = await admin
    .from("developer_agreement_versions")
    .insert({
      document_id: document.id,
      version_label: seed.versionLabel,
      body_html: seed.bodyHtml,
      source_filename: `${seed.slug}-v1.docx`,
      is_published: true,
      effective_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (versionError || !version) {
    console.error(versionError?.message ?? "version insert failed");
    process.exit(1);
  }

  const { error: linkError } = await admin
    .from("developer_agreement_documents")
    .update({
      current_version_id: version.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  if (linkError) {
    console.error(linkError.message);
    process.exit(1);
  }

  console.log("Seeded", seed.slug);
}

console.log("Done");
