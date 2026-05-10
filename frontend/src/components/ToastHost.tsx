// Renders the active toast queue stacked top-right. Mounted once
// in `App.tsx` so any component (including non-React paths like
// `api/client.ts`) can call `useToast.getState().push(...)`.

import { X, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useToast, type ToastKind } from "../store/toast";
import { Button } from "../components/ui";
import { useT } from "../i18n";

const KIND_STYLES: Record<ToastKind, { wrap: string; icon: React.ReactNode }> =
  {
    info: {
      wrap: "bg-white  text-text-primary",
      icon: <Info size={16} className="text-accent" />,
    },
    warn: {
      wrap: "bg-amber-50 border-amber-300 text-amber-900",
      icon: <AlertTriangle size={16} className="text-amber-600" />,
    },
    error: {
      wrap: "bg-red-50 border-red-300 text-red-900",
      icon: <AlertCircle size={16} className="text-red-600" />,
    },
  };

export default function ToastHost() {
  const t = useT();
  const messages = useToast((s) => s.messages);
  const dismiss = useToast((s) => s.dismiss);

  if (messages.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={t("toast.region_label")}
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
    >
      {messages.map((m) => {
        const style = KIND_STYLES[m.kind];
        return (
          <div
            key={m.id}
            role={m.kind === "error" ? "alert" : "status"}
            aria-live={m.kind === "error" ? "assertive" : "polite"}
            className={`border rounded-lg shadow-md px-3 py-2 flex items-start gap-2 ${style.wrap}`}
          >
            <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
            <div className="flex-1 text-sm">{m.text}</div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => dismiss(m.id)}
              aria-label={t("toast.dismiss_aria")}
            >
              <X size={14} />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
