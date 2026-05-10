// Element picker shown when the operator clicks "+ Elemento"
// inside a row's column. Replaces the persistent left-side
// library panel — the canvas owns the full editing surface;
// element types only surface on demand.
//
// Top-level "+ Fila" doesn't need this modal (Row is the
// only top-level block kind in the new builder model). The
// modal exclusively serves the in-column flow.

import { useState } from "react";
import {
  Heading as HeadingIcon,
  Pilcrow,
  MousePointerClick,
  Image as ImageIcon,
  Minus,
  Square,
  List as ListIcon,
} from "lucide-react";

import type { EmailBlock } from "../../api/emailTemplates";
import { Modal } from "../../components/ui";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

interface PickerEntry {
  kind:
    | "heading"
    | "paragraph"
    | "button"
    | "image"
    | "divider"
    | "spacer"
    | "list";
  icon: React.ReactNode;
  labelKey: CatalogKey;
  factory: () => EmailBlock;
}

const ENTRIES: PickerEntry[] = [
  {
    kind: "heading",
    icon: <HeadingIcon size={20} />,
    labelKey: "marketing.email_templates.block.heading",
    factory: () => ({
      kind: "heading",
      text: "Encabezado",
      level: 2,
      color: null,
      align: "left",
    }),
  },
  {
    kind: "paragraph",
    icon: <Pilcrow size={20} />,
    labelKey: "marketing.email_templates.block.paragraph",
    factory: () => ({
      kind: "paragraph",
      text: "Texto del párrafo",
      color: null,
      align: "left",
      font_size: 16,
    }),
  },
  {
    kind: "button",
    icon: <MousePointerClick size={20} />,
    labelKey: "marketing.email_templates.block.button",
    factory: () => ({
      kind: "button",
      text: "Llamado a la acción",
      url: "https://",
      bg_color: "#4f46e5",
      text_color: "#ffffff",
      align: "center",
    }),
  },
  {
    kind: "image",
    icon: <ImageIcon size={20} />,
    labelKey: "marketing.email_templates.block.image",
    factory: () => ({
      kind: "image",
      url: "https://",
      alt: "",
      width: 600,
      align: "center",
      link_url: null,
    }),
  },
  {
    kind: "divider",
    icon: <Minus size={20} />,
    labelKey: "marketing.email_templates.block.divider",
    factory: () => ({ kind: "divider", color: "#e5e7eb" }),
  },
  {
    kind: "spacer",
    icon: <Square size={20} />,
    labelKey: "marketing.email_templates.block.spacer",
    factory: () => ({ kind: "spacer", height_px: 24 }),
  },
  {
    kind: "list",
    icon: <ListIcon size={20} />,
    labelKey: "marketing.email_templates.block.list",
    factory: () => ({
      kind: "list",
      items: ["Primer ítem", "Segundo ítem"],
      ordered: false,
      color: null,
    }),
  },
];

export interface BlockPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Fired with a freshly-built block when the operator
   *  picks a tile. Caller is responsible for inserting it
   *  into the right column + closing the modal. */
  onPick: (block: EmailBlock) => void;
}

export default function BlockPickerModal({
  open,
  onClose,
  onPick,
}: BlockPickerModalProps) {
  const t = useT();
  const [hoveredKind, setHoveredKind] = useState<string | null>(null);

  if (!open) return null;

  return (
    <Modal
      title={t("marketing.email_templates.picker.title")}
      size="md"
      onClose={onClose}
    >
      <div className="space-y-3 px-4 py-4">
        <p className="text-xs text-text-secondary">
          {t("marketing.email_templates.picker.subtitle")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ENTRIES.map((entry) => (
            <button
              key={entry.kind}
              type="button"
              onMouseEnter={() => setHoveredKind(entry.kind)}
              onMouseLeave={() => setHoveredKind(null)}
              onClick={() => {
                onPick(entry.factory());
                onClose();
              }}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-4 text-xs transition-colors ${
                hoveredKind === entry.kind
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-panel hover:border-primary/50"
              }`}
            >
              <span className="text-text-secondary">{entry.icon}</span>
              <span className="font-medium">{t(entry.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
