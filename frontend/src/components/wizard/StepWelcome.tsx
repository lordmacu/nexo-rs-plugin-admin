import { MessageCircle } from "lucide-react";
import { Button } from "../ui";
import { useT } from "../../i18n";

interface StepWelcomeProps {
  onStart: () => void;
}

export default function StepWelcome({ onStart }: StepWelcomeProps) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="text-accent" size={32} />
        <h1 className="text-2xl font-semibold text-text-primary">
          {t("wizard.welcome.title")}
        </h1>
      </div>
      <p className="text-text-secondary leading-relaxed">
        {t("wizard.welcome.intro")}
      </p>
      <ul className="space-y-2 text-sm text-text-secondary">
        <li className="flex gap-2">
          <span className="text-accent">1.</span>
          <span>{t("wizard.welcome.step1")}</span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">2.</span>
          <span>{t("wizard.welcome.step2")}</span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">3.</span>
          <span>{t("wizard.welcome.step3")}</span>
        </li>
      </ul>
      <Button variant="primary" size="md" onClick={onStart}>
        {t("wizard.welcome.start")}
      </Button>
    </div>
  );
}
