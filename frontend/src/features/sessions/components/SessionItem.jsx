import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useChatContext } from "../../chat/context/ChatContext.jsx";
import ConfirmationModal from "../../../core/components/ui/ConfirmationModal.jsx";

function SessionItem({ session, searchQuery = "" }) {
  const navigate = useNavigate();
  const {
    currentSessionId,
    setCurrentSessionId,
    editingSessionId,
    editingName,
    setEditingName,
    saveRename,
    startRename,
    deleteSession,
    setEditingSessionId,
    setIsSidebarOpen
  } = useChatContext();

  const [menuOpen, setMenuOpen] = useState(false);
  // FIX 2: inline delete confirmation state — replaces window.confirm()
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef(null);
  const isEditing = session.id === editingSessionId;
  const isActive = session.id === currentSessionId;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleSelect = useCallback(() => {
    if (!isEditing) {
      navigate(`/chat/${session.id}`);
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    }
  }, [isEditing, session.id, navigate, setIsSidebarOpen]);

  const handleDoubleClick = useCallback((e) => {
    startRename(session.id, session.name, e);
  }, [session.id, session.name, startRename]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      saveRename(session.id);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  }, [session.id, saveRename, setEditingSessionId]);

  const handleBlur = useCallback(() => {
    saveRename(session.id);
  }, [session.id, saveRename]);

  const handleToggleMenu = useCallback((e) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
    setConfirmingDelete(false);
  }, []);

  const handleRename = useCallback((e) => {
    e.stopPropagation();
    setMenuOpen(false);
    startRename(session.id, session.name, e);
  }, [session.id, session.name, startRename]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmingDelete(true);
  }, []);

  const handleConfirmDelete = useCallback((e) => {
    e.stopPropagation();
    setConfirmingDelete(false);
    deleteSession(session.id, e);
  }, [session.id, deleteSession]);

  const handleCancelDelete = useCallback((e) => {
    if (e) e.stopPropagation();
    setConfirmingDelete(false);
  }, []);

  const highlightName = (name, query) => {
    if (!query || !query.trim()) return name;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = name.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="font-semibold text-text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={`sidebar-session-item group relative flex items-center gap-1.5 px-2 py-2.25 sm:py-1.5 rounded-lg cursor-pointer transition-colors duration-150 ${
        isActive
          ? "active bg-surface text-text-primary"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
      data-active={isActive}
      style={{ minHeight: "44px" }}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            className="flex-1 text-sm bg-background border border-primary text-text-primary rounded px-2 py-0.5 outline-none min-w-0"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              saveRename(session.id);
            }}
            className="p-1 rounded bg-primary hover:bg-primary-hover text-white flex items-center justify-center border-none cursor-pointer transition-colors"
            title="Confirm rename"
          >
            <Icon icon="material-symbols:check" className="text-sm" />
          </button>
        </div>
      ) : (
        <span
          className="flex-1 text-sm truncate select-none leading-snug min-w-0"
          title={session.name}
        >
          {highlightName(session.name, searchQuery)}
        </span>
      )}

      {!isEditing && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            className={`p-1.5 rounded-md transition-all duration-150 text-base flex items-center justify-center border-none bg-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
              menuOpen
                ? "opacity-100 text-text-primary bg-surface-hover"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
            onClick={handleToggleMenu}
            title="More options"
          >
            <Icon icon="material-symbols:more-horiz" />
          </button>

          {menuOpen && (
            <div className="session-dropdown">
              {/* Rename option */}
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer border-none bg-transparent text-left"
                onClick={handleRename}
              >
                <Icon icon="material-symbols:edit-outline" className="text-base shrink-0" />
                Rename
              </button>

              {/* Delete option */}
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer border-none bg-transparent text-left"
                onClick={handleDeleteClick}
              >
                <Icon icon="material-symbols:delete-outline" className="text-base shrink-0" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmingDelete}
        title="Delete chat?"
        message="Are you sure you want to delete this chat?"
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />
    </div>
  );
}

export default SessionItem;
