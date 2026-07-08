// NovaMind — frontend/src/components/sidebar/SidebarFooter.jsx

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../../chat/context/ChatContext.jsx";
import { useAuth } from "../../../core/context/AuthContext.jsx";

function SidebarFooter() {
  const { setIsSettingsOpen } = useChatContext();
  const { user } = useAuth();

  const initials = useMemo(() => (
    user?.name
      ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : user?.email?.slice(0, 2).toUpperCase() || "?"
  ), [user]);

  const displayName = user?.name || user?.email || "User";
  const displaySub = user?.name ? user.email : "Signed in";

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  return (
    <div
      className="relative flex items-center justify-between px-3 py-3 border-t shrink-0 select-none"
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* Left: User Card Info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 select-none"
          style={{ background: "var(--color-primary)" }}
        >
          {initials}
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm font-semibold text-text-primary truncate leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-text-secondary select-none leading-none font-medium mt-0.5 truncate">
            {displaySub}
          </span>
        </div>
      </div>

      {/* Right: Settings Trigger */}
      <div className="flex items-center relative z-50">
        <button
          className="w-8 h-8 flex items-center justify-center border-none bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-md cursor-pointer transition-colors duration-200 text-lg"
          onClick={handleOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <Icon icon="material-symbols:settings-outline-rounded" />
        </button>
      </div>
    </div>
  );
}

export default SidebarFooter;
