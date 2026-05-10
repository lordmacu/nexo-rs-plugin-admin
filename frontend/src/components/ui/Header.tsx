// Conversation / panel header — title + optional avatar +
// optional subtitle + trailing actions row. Replaces the
// bespoke ChatHeader in chats/.

import type { ReactNode } from "react";
import Avatar from "./Avatar";

export interface HeaderProps {
  /** Optional avatar — pass the seed string to render the
   *  initials disc. Omit to skip the avatar slot entirely. */
  avatarSeed?: string;
  /** Optional avatar display name (used for initials when
   *  `avatarSeed` is set). Defaults to `title`. */
  avatarName?: string;
  title: string;
  /** Optional one-line subtitle — sender email, lead state,
   *  agent id, etc. */
  subtitle?: ReactNode;
  /** Optional trailing icon-button row (mute / archive /
   *  three-dot menu). */
  actions?: ReactNode;
}

export default function Header({
  avatarSeed,
  avatarName,
  title,
  subtitle,
  actions,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b bg-panel px-4 py-3">
      {avatarSeed && (
        <Avatar name={avatarName ?? title} seed={avatarSeed} size={36} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-xs text-text-secondary">{subtitle}</div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
