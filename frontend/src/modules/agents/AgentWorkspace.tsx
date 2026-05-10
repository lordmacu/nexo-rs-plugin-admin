// `/agents/:agent_id/workspace` — persona + knowledge editor.
// Linked from the Agents page so operators can iterate on an
// agent's persona / source-of-truth docs without rebuilding the
// agent from scratch.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import KnowledgeUploader from "./workspace/KnowledgeUploader";
import PersonaEditor from "./workspace/PersonaEditor";
import { Button } from "../../components/ui";

type Tab = "persona" | "knowledge";

export default function AgentWorkspace() {
  const { agent_id } = useParams();
  const [tab, setTab] = useState<Tab>("persona");

  if (!agent_id) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        Falta `agent_id` en la URL.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-panel-alt">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/agents"
            className="text-text-secondary hover:text-text-primary flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Agentes
          </Link>
          <span className="text-text-secondary">/</span>
          <span className="font-mono text-text-primary">{agent_id}</span>
          <span className="text-text-secondary">/</span>
          <span className="text-text-primary">workspace</span>
        </div>

        <div className="border-b  flex gap-1">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setTab("persona")}
          >
            <Sparkles size={14} /> Persona
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setTab("knowledge")}
          >
            <BookOpen size={14} /> Conocimiento
          </Button>
        </div>

        <div className="bg-white border  rounded p-5">
          {tab === "persona" ? (
            <PersonaEditor agent_id={agent_id} />
          ) : (
            <KnowledgeUploader agent_id={agent_id} />
          )}
        </div>
      </div>
    </div>
  );
}
