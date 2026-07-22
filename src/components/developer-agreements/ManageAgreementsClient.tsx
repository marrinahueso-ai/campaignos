"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  publishDeveloperAgreementVersionAction,
  seedDeveloperAgreementsAction,
  type AgreementActionState,
} from "@/lib/developer-agreements/actions";

type ManagedDoc = {
  id: string;
  slug: string;
  title: string;
  description: string;
  documentNumber: string | null;
  currentVersionLabel: string | null;
  currentEffectiveAt: string | null;
  currentSourceFilename: string | null;
  isActive: boolean;
  requiredForRoles: string[];
};

const initialState: AgreementActionState = {
  error: null,
  success: false,
};

export function ManageAgreementsClient({
  documents,
  published,
}: {
  documents: ManagedDoc[];
  published?: boolean;
}) {
  const [publishState, publishAction, publishPending] = useActionState(
    publishDeveloperAgreementVersionAction,
    initialState,
  );
  const [seedState, seedAction, seedPending] = useActionState(
    async (_prev: AgreementActionState, _formData: FormData) =>
      seedDeveloperAgreementsAction(),
    initialState,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c554c]">
          Hey Ralli ops
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#2a2622]">
          Developer agreements
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5c554c]">
          Upload and version NDA, IP, and future employee agreements. Developers
          must sign the current published version before accessing the app.
        </p>
      </div>

      {published && (
        <p className="rounded-lg border border-[#cfe0cf] bg-[#eef2ec] px-4 py-3 text-sm text-[#3f5240]">
          New version published. Anyone who has not signed this version will be
          prompted on next sign-in.
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-[#ddd4c8] bg-white p-5">
        <h2 className="text-sm font-semibold">Current documents</h2>
        {documents.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[#5c554c]">
              No agreements in the database yet. Seed the starting NDA and IP
              documents from the repo.
            </p>
            <form action={seedAction}>
              <Button type="submit" disabled={seedPending}>
                {seedPending ? "Seeding…" : "Seed NDA + IP"}
              </Button>
            </form>
            {seedState.error && (
              <p className="text-sm text-[#8f4a38]">{seedState.error}</p>
            )}
            {seedState.success && (
              <p className="text-sm text-[#3f5240]">
                Seeded. Refresh if the list is still empty.
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#eee7dc]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[#2a2622]">{doc.title}</p>
                  <p className="text-xs text-[#5c554c]">
                    {doc.slug}
                    {doc.documentNumber ? ` · ${doc.documentNumber}` : ""}
                    {" · roles: "}
                    {doc.requiredForRoles.join(", ")}
                  </p>
                </div>
                <div className="text-sm text-[#5c554c]">
                  {doc.currentVersionLabel ?? "No version"}
                  {doc.currentEffectiveAt
                    ? ` · ${new Date(doc.currentEffectiveAt).toLocaleDateString()}`
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[#ddd4c8] bg-white p-5">
        <h2 className="text-sm font-semibold">Publish a new version</h2>
        <p className="mt-1 text-sm text-[#5c554c]">
          Upload a .docx / .html / .txt file, or paste HTML. Publishing sets this
          as the current version developers must sign.
        </p>

        <form action={publishAction} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#5c554c]">
              Existing document (optional)
            </label>
            <select
              name="documentId"
              className="h-11 w-full rounded-md border border-[#ddd4c8] bg-white px-3 text-sm"
              defaultValue=""
            >
              <option value="">Create new document…</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="slug" label="Slug (new only)" placeholder="employee-handbook" />
            <Input name="versionLabel" label="Version label" placeholder="NDA-2026-02" required />
          </div>
          <Input name="title" label="Title (new or rename)" placeholder="Non-Disclosure Agreement (NDA)" />
          <Input
            name="description"
            label="Short description"
            placeholder="Protects confidential Hey Ralli information."
          />

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#5c554c]">
              Upload file
            </label>
            <input
              type="file"
              name="file"
              accept=".docx,.html,.htm,.txt"
              className="block w-full text-sm text-[#5c554c]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#5c554c]">
              Or paste HTML body
            </label>
            <textarea
              name="bodyHtml"
              rows={8}
              className="w-full rounded-md border border-[#ddd4c8] bg-white px-3 py-2 text-sm"
              placeholder="<h1>…</h1><p>…</p>"
            />
          </div>

          {publishState.error && (
            <p className="text-sm text-[#8f4a38]">{publishState.error}</p>
          )}

          <Button type="submit" disabled={publishPending}>
            {publishPending ? "Publishing…" : "Publish version"}
          </Button>
        </form>
      </section>
    </div>
  );
}
