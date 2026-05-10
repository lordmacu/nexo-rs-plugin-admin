import { AlertCircle } from "lucide-react";
import { useFirehose } from "../../store/firehose";
import { useT } from "../../i18n";

export default function ConnectionBanner() {
  const t = useT();
  const status = useFirehose((s) => s.status);
  const lagged = useFirehose((s) => s.lagged_count);

  if (status === "connected") return null;

  const message =
    status === "connecting"
      ? t("chat.connection.connecting")
      : status === "lagged"
        ? t("chat.connection.lagged", { count: lagged })
        : t("chat.connection.disconnected");

  const tone =
    status === "disconnected"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-yellow-100 text-yellow-900 border-yellow-200";

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-10 border-b px-4 py-2 text-sm flex items-center gap-2 ${tone}`}
    >
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  );
}
