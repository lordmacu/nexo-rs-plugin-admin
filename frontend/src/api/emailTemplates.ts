// API client for /api/marketing/email-templates/*.
//
// Block shapes mirror the marketing extension's Rust enum
// EmailBlock (serde tag = "kind", snake_case). Frontend is the
// authoring side — sends blocks JSON to the backend; backend
// is the rendering side.
//
// See nexo-rs-extension-marketing/src/email_template/blocks.rs
// for the canonical type doc + render semantics.

import { authedFetch, HttpError } from "./client";

export type TextAlign = "left" | "center" | "right";

/** How an Image block delivers bytes to the recipient.
 *  - "url" (default) — public URL; smaller emails + tracking.
 *  - "cid" — bytes inline as multipart/related; renders even
 *    when the client blocks external images (Outlook). */
export type ImageEmbed = "url" | "cid";

export interface Column {
  blocks: EmailBlock[];
  width_pct: number;
  /** Optional per-column background colour (`#rrggbb`).
   *  `null` / undefined = transparent. Combines with
   *  `background_image` (image stacks on top, colour shows
   *  through transparency + acts as fallback when the
   *  recipient's client blocks remote images). */
  background?: string | null;
  /** Optional per-column background image URL. `http(s)://`
   *  only — backend `sanitize_url` rejects everything else
   *  at render time. */
  background_image?: string | null;
}

export type EmailBlock =
  | { kind: "heading"; text: string; text_html?: string; level: number; color?: string | null; align: TextAlign }
  | { kind: "paragraph"; text: string; text_html?: string; color?: string | null; align: TextAlign; font_size: number }
  | { kind: "button"; text: string; url: string; bg_color: string; text_color: string; align: TextAlign }
  | { kind: "image"; url: string; alt: string; width?: number | null; align: TextAlign; link_url?: string | null; embed?: ImageEmbed }
  | { kind: "divider"; color: string }
  | { kind: "spacer"; height_px: number }
  /** Legacy 50/50 two-column block. Backend auto-migrates
   *  these to `row` on read; included here for type
   *  completeness / forward compat. */
  | { kind: "two_column"; left: EmailBlock[]; right: EmailBlock[] }
  /** Generalised Elementor-style row container. Holds 1-N
   *  columns whose `width_pct` values sum to 100. Optional
   *  `background` paints behind the whole row. */
  | { kind: "row"; columns: Column[]; background?: string | null; background_image?: string | null }
  | { kind: "list"; items: string[]; ordered: boolean; color?: string | null };

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  blocks: EmailBlock[];
  /** Optional page background colour (`#rrggbb`) applied to
   *  the email's outer wrapper. `null` ⇒ default `#f5f5f5`. */
  page_background?: string | null;
  /** Optional page-level background image URL. Combines with
   *  `page_background` colour. `http(s)://` only. */
  page_background_image?: string | null;
  updated_at_ms: number;
}

interface Envelope<T> { ok: true; result: T; }
interface ErrorEnvelope { ok: false; error: { code: string; message?: string }; }

async function call<T>(path: string, init?: RequestInit & { jsonBody?: unknown }): Promise<T> {
  const opts: RequestInit = { ...(init ?? {}) };
  if (init?.jsonBody !== undefined) {
    opts.headers = {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    };
    opts.body = JSON.stringify(init.jsonBody);
  }
  const res = await authedFetch(`/api/marketing${path}`, opts);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON email-templates response)");
  }
  const wrapped = body as Envelope<T> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<T>).result;
}

export async function listEmailTemplates(): Promise<{
  templates: EmailTemplate[];
  count: number;
}> {
  return call("/email-templates");
}

export async function getEmailTemplate(id: string): Promise<{
  template: EmailTemplate;
}> {
  return call(`/email-templates/${encodeURIComponent(id)}`);
}

export async function createEmailTemplate(body: {
  name: string;
  blocks: EmailBlock[];
  page_background?: string;
  page_background_image?: string;
}): Promise<{ template: EmailTemplate }> {
  return call("/email-templates", { method: "POST", jsonBody: body });
}

export async function updateEmailTemplate(
  id: string,
  body: {
    name: string;
    blocks: EmailBlock[];
    page_background?: string;
    page_background_image?: string;
  },
): Promise<{ template: EmailTemplate }> {
  return call(`/email-templates/${encodeURIComponent(id)}`, {
    method: "PUT",
    jsonBody: body,
  });
}

export async function deleteEmailTemplate(id: string): Promise<{ deleted: string }> {
  return call(`/email-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function renderEmailTemplate(
  id: string,
  vars: Record<string, string>,
): Promise<{ id: string; html: string; vars_used: Record<string, string> }> {
  return call(`/email-templates/${encodeURIComponent(id)}/render`, {
    method: "POST",
    jsonBody: { vars },
  });
}

/** Preview render for the builder UI — POST blocks JSON
 *  directly (no persistence) and get rendered HTML back.
 *  Server runs the same email-safe sanitizer the real send
 *  path uses, so what the operator sees is what recipients
 *  get. */
export async function previewEmailTemplate(
  blocks: EmailBlock[],
  vars: Record<string, string>,
  pageBackground?: string | null,
  pageBackgroundImage?: string | null,
): Promise<{ html: string }> {
  return call(`/email-templates/preview`, {
    method: "POST",
    jsonBody: {
      blocks,
      vars,
      ...(pageBackground ? { page_background: pageBackground } : {}),
      ...(pageBackgroundImage
        ? { page_background_image: pageBackgroundImage }
        : {}),
    },
  });
}

/** Result of a successful image upload. The backend optimised
 *  the bytes (cap 1200px longer side, JPEG q85, EXIF stripped)
 *  before storing — `size_bytes` is the optimised size, the
 *  pre-optimisation size is reported as `input_size_bytes`
 *  so the UI can surface the savings. */
export interface UploadedAsset {
  url: string;
  sha256: string;
  mime: string;
  size_bytes: number;
  input_size_bytes: number;
  width: number;
  height: number;
}

/** One row from the media-library list endpoint. `url` is null
 *  when MARKETING_TRACKING_BASE_URL is unconfigured (asset is
 *  stored but no public URL to serve it under) — the UI
 *  filters those out since they can't be inserted anyway. */
export interface LibraryAsset {
  sha256: string;
  mime: string;
  size_bytes: number;
  created_at_ms: number;
  url: string | null;
}

/** GET /api/marketing/template-assets — metadata for the
 *  WordPress-style media library grid. Newest first. */
export async function listTemplateAssets(): Promise<{
  assets: LibraryAsset[];
  count: number;
}> {
  return call("/template-assets");
}

/** DELETE /api/marketing/template-assets/:sha — remove from
 *  library. Idempotent: a missing sha returns ok with
 *  deleted=false. */
export async function deleteTemplateAsset(sha: string): Promise<{
  sha256: string;
  deleted: boolean;
}> {
  return call(`/template-assets/${encodeURIComponent(sha)}`, {
    method: "DELETE",
  });
}

/** Upload an image for use in an `Image` block. Wraps the
 *  file in a multipart envelope, hits the microapp proxy
 *  which forwards verbatim to the marketing extension; the
 *  extension decodes + re-encodes (optimisation) + stores +
 *  mints a public URL the recipient's mail client can fetch.
 *
 *  Hard caps enforced server-side: 5 MB, image/png|jpeg|gif|
 *  webp only, mime-sniffed against magic bytes. */
export async function uploadTemplateAsset(file: File): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  // No `Content-Type` header here — the browser stamps the
  // correct multipart/form-data with boundary automatically;
  // setting it manually breaks the boundary parameter.
  const res = await authedFetch(`/api/marketing/template-assets`, {
    method: "POST",
    body: form,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON template-assets response)");
  }
  const wrapped = body as Envelope<UploadedAsset> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<UploadedAsset>).result;
}
