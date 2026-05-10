import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui";
import { useT } from "../../i18n";

interface StepDoneProps {
  onGoToDashboard: () => void;
}

export default function StepDone({ onGoToDashboard }: StepDoneProps) {
  const t = useT();
  return (
    <div className="space-y-5 text-center">
      <CheckCircle2 className="text-accent mx-auto" size={64} />
      <h1 className="text-2xl font-semibold text-text-primary">
        {t("wizard.done.title")}
      </h1>
      <p className="text-text-secondary leading-relaxed max-w-md mx-auto">
        {t("wizard.done.subtitle")}
      </p>
      <Button variant="primary" size="md" onClick={onGoToDashboard}>
        {t("wizard.done.go_dashboard")}
      </Button>
    </div>
  );
}
