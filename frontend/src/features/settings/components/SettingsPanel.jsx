// NovaMind — SettingsPanel.jsx — Secondary settings layer
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useChatContext } from "../../chat/context/ChatContext.jsx";
import { useAuth } from "../../../core/context/AuthContext.jsx";
import ErrorMessage from "../../../core/components/ui/ErrorMessage.jsx";
import ConfirmationModal from "../../../core/components/ui/ConfirmationModal.jsx";
import { LANGUAGES } from "../../../core/constants/index.js";
import { api } from "../../../config/api.js";

function SettingsPanel() {
  const { user, setUser, logout, deleteAccount, changePassword } = useAuth();
  const { 
    isSettingsOpen, 
    setIsSettingsOpen, 
    setIsFooterMenuOpen, 
    clearAllSessions,
    selectedLanguage,
    setSelectedLanguage
  } = useChatContext();

  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'account' | 'memory'

  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleClearChatsClick = () => {
    setShowClearChatsConfirm(true);
  };

  const handleConfirmClearChats = async () => {
    try {
      await clearAllSessions();
      setShowClearChatsConfirm(false);
      handleCloseAll();
    } catch (err) {
      console.error("[SettingsPanel] Failed to clear all sessions:", err.message);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    handleCloseAll();
  };

  // Profile update state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const [memories, setMemories] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  const [deletingMemoryId, setDeletingMemoryId] = useState(null);
  const [confirmClearMemories, setConfirmClearMemories] = useState(false);
  const [isDeletingAllMemories, setIsDeletingAllMemories] = useState(false);
  const [memorySearch, setMemorySearch] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleClosePanel = () => {
    setIsSettingsOpen(false);
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setShowDeleteConfirm(false);
    setDeletePassword("");
    setDeleteError("");
    setConfirmClearMemories(false);
    setNameError("");
    setNameSuccess("");
    setIsEditingName(false);
  };

  const handleCloseAll = () => {
    handleClosePanel();
    setIsFooterMenuOpen(false);
  };

  useEffect(() => {
    if (!isSettingsOpen) return;

    let cancelled = false;
    setMemoriesLoading(true);
    setMemoryError("");

    api.memory.list()
      .then((data) => {
        if (!cancelled) setMemories(data.memories || []);
      })
      .catch(() => {
        if (!cancelled) setMemoryError("Failed to load memories.");
      })
      .finally(() => {
        if (!cancelled) setMemoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClosePanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSettingsOpen]);

  // Sync display name with user object when it changes
  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user]);

  if (!isSettingsOpen) return null;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  const displayEmail = user?.email || "Signed in";

  const handleSaveName = async () => {
    setNameError("");
    setNameSuccess("");
    if (!displayName.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }

    // Check if the name actually changed. If not, do NOT trigger any API call!
    if (displayName.trim() === (user?.name || "")) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await api.auth.updateProfile(displayName);
      setUser(res.user);
      setNameSuccess("Profile name updated successfully!");
      setIsEditingName(false);
    } catch (err) {
      setNameError(err.message || "Failed to update profile name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    setDeletingMemoryId(id);
    try {
      await api.memory.deleteOne(id);
      setMemories((prev) => prev.filter((m) => m._id !== id));
    } catch {
      setMemoryError("Failed to delete memory.");
    } finally {
      setDeletingMemoryId(null);
    }
  };

  const handleDeleteAllMemories = async () => {
    setIsDeletingAllMemories(true);
    try {
      await api.memory.deleteAll();
      setMemories([]);
      setConfirmClearMemories(false);
    } catch {
      setMemoryError("Failed to clear memories.");
    } finally {
      setIsDeletingAllMemories(false);
    }
  };

  const validatePasswordChange = () => {
    if (!currentPassword) return "Please enter your current password.";
    if (!newPassword) return "Please enter a new password.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (newPassword === currentPassword) return "New password must be different from current password.";
    if (newPassword !== confirmNewPassword) return "New passwords do not match.";
    return null;
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    const validationError = validatePasswordChange();
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm account deletion.");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword);
      handleCloseAll();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Incorrect password.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter memories based on search query
  const filteredMemories = memories.filter((m) =>
    (m.content || "").toLowerCase().includes(memorySearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center sm:p-6 p-0 animate-in fade-in duration-200"
      onClick={handleClosePanel}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px]" aria-hidden="true" />

      <div
        className="z-61 modal-appear p-6 shadow-2xl flex flex-col gap-4 overflow-hidden transition-all duration-200 ease-out fixed inset-0 rounded-none w-full h-full max-w-none max-h-none sm:relative sm:inset-auto sm:rounded-2xl sm:w-full sm:max-w-200 sm:max-h-[85vh] sm:h-150"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3.5" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md border-none bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer sm:hidden"
              onClick={handleClosePanel}
              aria-label="Back"
              title="Back"
            >
              <Icon icon="material-symbols:arrow-back" className="text-lg" />
            </button>
            <h3 className="font-display font-bold text-[18px] text-text-primary tracking-wide">Settings</h3>
          </div>
          <button
            className="bg-transparent border-none text-text-secondary hover:text-accent-red cursor-pointer text-xl p-1 rounded-md hover:bg-surface-hover transition-colors flex items-center justify-center"
            onClick={handleCloseAll}
            aria-label="Close settings"
          >
            <Icon icon="material-symbols:close" />
          </button>
        </div>

        {/* Modal Body with Split Pane Layout */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 gap-4 sm:gap-0">
          
          {/* Navigation Sidebar */}
          <div className="w-full sm:w-55 shrink-0 flex flex-row sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r pb-3 sm:pb-0 sm:pr-4" style={{ borderColor: "var(--color-border)" }}>
            <button
              className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border-none cursor-pointer text-left ${
                activeTab === "general"
                  ? "bg-primary text-white animate-pulse-subtle"
                  : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
              onClick={() => setActiveTab("general")}
            >
              <Icon icon="material-symbols:settings-outline-rounded" className="text-lg" />
              <span>General settings</span>
            </button>

            <button
              className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border-none cursor-pointer text-left ${
                activeTab === "account"
                  ? "bg-primary text-white animate-pulse-subtle"
                  : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
              onClick={() => setActiveTab("account")}
            >
              <Icon icon="material-symbols:person-outline-rounded" className="text-lg" />
              <span>Account settings</span>
            </button>

            <button
              className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border-none cursor-pointer text-left ${
                activeTab === "memory"
                  ? "bg-primary text-white animate-pulse-subtle"
                  : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
              onClick={() => setActiveTab("memory")}
            >
              <Icon icon="material-symbols:memory" className="text-lg" />
              <span>AI Memory</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto pl-0 sm:pl-6 pr-1 flex flex-col gap-5.5 scrollbar-thin relative pb-2 select-none">
            {/* Tab 1: General settings */}
            {activeTab === "general" && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                {/* App Preferences */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Preferences</span>
                  <div className="flex flex-col gap-2 relative">
                    <label className="text-xs font-semibold text-text-secondary">Default Language</label>
                    
                    {/* Custom Select Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                        className="w-full bg-background border rounded-xl px-4 py-3 text-[13.5px] font-sans text-text-primary outline-none focus:border-primary transition-all cursor-pointer text-left flex items-center justify-between"
                        style={{ borderColor: "var(--color-border)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}
                      >
                        <span>{selectedLanguage}</span>
                        <Icon 
                          icon="material-symbols:keyboard-arrow-down-rounded" 
                          className={`text-lg text-text-muted transition-transform duration-200 ${isLangDropdownOpen ? "rotate-180" : ""}`} 
                        />
                      </button>

                      {/* Custom Dropdown List */}
                      {isLangDropdownOpen && (
                        <>
                          {/* Invisible Click Outside Backdrop */}
                          <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setIsLangDropdownOpen(false)} 
                          />
                          
                          <div 
                            className="absolute left-0 right-0 mt-1.5 rounded-xl border p-1.5 shadow-xl z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
                            style={{ 
                              background: "var(--color-surface)", 
                              borderColor: "var(--color-border)",
                              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)" 
                            }}
                          >
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => {
                                  setSelectedLanguage(lang);
                                  setIsLangDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors border-none bg-transparent cursor-pointer flex items-center justify-between ${
                                  selectedLanguage === lang
                                    ? "bg-primary text-white font-bold"
                                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                }`}
                              >
                                <span>{lang}</span>
                                {selectedLanguage === lang && (
                                  <Icon icon="material-symbols:check-rounded" className="text-base" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* PWA App Installation */}
                {installPrompt && !isAppInstalled && (
                  <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Application</span>
                    <div className="flex items-center justify-between border p-4 rounded-2xl" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.01)" }}>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-xs font-bold text-text-primary">Install NovaMind App</div>
                        <p className="text-[11px] text-text-secondary mt-1 leading-normal">
                          Install NovaMind as a desktop or mobile application for offline capabilities and a full-screen standalone experience.
                        </p>
                      </div>
                      <button
                        className="px-4 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-all cursor-pointer border-none shadow-sm shrink-0 flex items-center gap-1.5"
                        onClick={async () => {
                          if (!installPrompt) return;
                          installPrompt.prompt();
                          const { outcome } = await installPrompt.userChoice;
                          if (outcome === 'accepted') {
                            setInstallPrompt(null);
                          }
                        }}
                      >
                        <Icon icon="material-symbols:install-desktop-rounded" className="text-sm" />
                        Install App
                      </button>
                    </div>
                  </div>
                )}

                {/* Account & Chat Actions */}
                <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Account Actions</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      className="flex-1 px-4 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                      style={{ borderColor: "var(--color-border)" }}
                      onClick={handleClearChatsClick}
                    >
                      <Icon icon="material-symbols:delete-sweep-outline-rounded" className="text-lg text-text-muted" />
                      <span>Clear all chats</span>
                    </button>
                    <button
                      className="flex-1 px-4 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 bg-transparent text-error/85 hover:text-error hover:bg-error/10"
                      style={{ borderColor: "var(--color-border)" }}
                      onClick={handleLogoutClick}
                    >
                      <Icon icon="material-symbols:logout" className="text-lg" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Account settings */}
            {activeTab === "account" && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                {/* Profile Information */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Profile Information</span>
                  
                  <div className="flex items-center gap-4 rounded-2xl border p-4.5" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 select-none shadow-md" 
                      style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-text-primary truncate">{user?.name || "NovaMind User"}</div>
                      <div className="text-xs text-text-secondary truncate mt-0.5">{displayEmail}</div>
                      {user?.createdAt && (
                        <div className="text-[10px] text-text-muted mt-1 select-none">
                          Member since: {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Name Form */}
                  <div className="flex flex-col gap-2.5 mt-1">
                    {!isEditingName ? (
                      <div className="flex items-center justify-between p-4.5 rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "rgba(255, 255, 255, 0.02)" }}>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Display Name</span>
                          <span className="text-[15px] font-bold text-text-primary mt-1 truncate">{user?.name || "NovaMind User"}</span>
                        </div>
                        <button
                          className="px-4 py-2 rounded-xl border bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                          style={{ borderColor: "var(--color-border)" }}
                          onClick={() => {
                            setDisplayName(user?.name || "");
                            setIsEditingName(true);
                            setNameError("");
                            setNameSuccess("");
                          }}
                        >
                          <Icon icon="material-symbols:edit-outline-rounded" className="text-sm" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-text-secondary">Display Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter your name"
                            value={displayName}
                            onChange={(e) => { setDisplayName(e.target.value); setNameError(""); setNameSuccess(""); }}
                            className="flex-1 bg-background border rounded-xl px-3.5 py-2 text-[13px] font-sans text-text-primary outline-none focus:border-primary transition-all"
                            style={{ borderColor: "var(--color-border)" }}
                            disabled={isSavingName}
                          />
                          <button
                            className="px-3.5 py-2 text-xs font-semibold border border-border bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl cursor-pointer transition-all"
                            onClick={() => {
                              setDisplayName(user?.name || "");
                              setIsEditingName(false);
                              setNameError("");
                              setNameSuccess("");
                            }}
                            disabled={isSavingName}
                          >
                            Cancel
                          </button>
                          <button
                            className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
                            onClick={handleSaveName}
                            disabled={isSavingName}
                          >
                            {isSavingName && <Icon icon="line-md:loading-twotone-loop" className="text-xs animate-spin" />}
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    <ErrorMessage message={nameError} fullWidth onDismiss={() => setNameError("")} className="mt-1" />
                    <ErrorMessage message={nameSuccess} variant="success" fullWidth onDismiss={() => setNameSuccess("")} className="mt-1" />
                  </div>
                </div>

                {/* Password / Security */}
                <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors cursor-pointer text-left border-none bg-transparent"
                    onClick={() => setShowPasswordForm((prev) => !prev)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon icon="material-symbols:key-outline-rounded" className="text-base text-text-muted" />
                      <span>Security & Password</span>
                    </div>
                    <Icon icon={showPasswordForm ? "material-symbols:expand-less" : "material-symbols:expand-more"} className="text-base text-text-muted" />
                  </button>

                  {showPasswordForm && (
                    <div className="flex flex-col gap-3 bg-background/30 p-4.5 rounded-2xl border animate-in slide-in-from-top-2 duration-150" style={{ borderColor: "var(--color-border)" }}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-text-secondary">Current Password</label>
                        <input
                          type="password"
                          placeholder="Current password"
                          value={currentPassword}
                          onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-xs font-sans text-text-primary outline-none focus:border-primary"
                          style={{ borderColor: "var(--color-border)" }}
                          disabled={isChangingPassword}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-text-secondary">New Password</label>
                        <input
                          type="password"
                          placeholder="New password (8+ chars)"
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-xs font-sans text-text-primary outline-none focus:border-primary"
                          style={{ borderColor: "var(--color-border)" }}
                          disabled={isChangingPassword}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-text-secondary">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmNewPassword}
                          onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-xs font-sans text-text-primary outline-none focus:border-primary"
                          style={{ borderColor: "var(--color-border)" }}
                          disabled={isChangingPassword}
                        />
                      </div>

                      <ErrorMessage message={passwordError} fullWidth onDismiss={() => setPasswordError("")} className="mt-1" />
                      <ErrorMessage message={passwordSuccess} variant="success" fullWidth onDismiss={() => setPasswordSuccess("")} className="mt-1" />

                      <button
                        className="w-full px-3 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                      >
                        {isChangingPassword && <Icon icon="line-md:loading-twotone-loop" className="text-xs animate-spin" />}
                        Update Password
                      </button>
                    </div>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="flex flex-col gap-3 border-t pt-5 border-error/20">
                  <span className="text-[10px] font-bold text-error/85 uppercase tracking-wider">Danger Zone</span>
                  <div className="flex items-center justify-between border border-error/20 bg-error/5 p-4 rounded-2xl">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-xs font-bold text-text-primary">Delete Account</div>
                      <p className="text-[11px] text-text-secondary mt-1 leading-normal">
                        Permanently delete your account, session history, and all stored memories. This action is irreversible.
                      </p>
                    </div>
                    <button
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-error hover:bg-error/95 rounded-xl transition-all cursor-pointer border-none shadow-sm shrink-0"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: AI Memory */}
            {activeTab === "memory" && (
              <div className="flex flex-col gap-4.5 animate-in fade-in duration-200">
                {/* Memory Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">AI Memory</span>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      NovaMind automatically remembers preferences, context, and facts about you across chats to build a personalized user profile.
                    </p>
                  </div>
                  {memories.length > 0 && (
                    <button
                      className="text-xs font-semibold text-error/70 hover:text-error bg-transparent border-none cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-error/10 transition-colors shrink-0"
                      onClick={() => setConfirmClearMemories(true)}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Memory Search */}
                {memories.length > 0 && (
                  <div className="relative flex items-center">
                    <Icon icon="material-symbols:search-rounded" className="absolute left-3 text-text-muted text-base" />
                    <input
                      type="text"
                      placeholder="Search saved facts..."
                      value={memorySearch}
                      onChange={(e) => setMemorySearch(e.target.value)}
                      className="w-full bg-background border rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-sans text-text-primary outline-none focus:border-primary"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  </div>
                )}

                {/* Memories List */}
                <div className="flex flex-col gap-2 max-h-87.5 overflow-y-auto scrollbar-thin pr-1">
                  {memoriesLoading && (
                    <div className="flex items-center gap-2 py-6 text-xs text-text-muted justify-center">
                      <Icon icon="line-md:loading-twotone-loop" className="animate-spin text-base" />
                      Loading memories...
                    </div>
                  )}
                  {!memoriesLoading && memoryError && (
                    <p className="text-xs text-error px-1">{memoryError}</p>
                  )}
                  {!memoriesLoading && !memoryError && memories.length === 0 && (
                    <div className="text-center py-8 px-4 border border-dashed rounded-2xl" style={{ borderColor: "var(--color-border)" }}>
                      <Icon icon="material-symbols:brain-menu-rounded" className="text-4xl text-text-muted mb-2 opacity-40 mx-auto" />
                      <p className="text-xs text-text-muted max-w-70 mx-auto leading-relaxed">
                        No memories yet. Start chatting and NovaMind will automatically remember things about you.
                      </p>
                    </div>
                  )}
                  {!memoriesLoading && memories.length > 0 && filteredMemories.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-6">No matching memories found.</p>
                  )}
                  {!memoriesLoading && filteredMemories.map((m) => (
                    <div 
                      key={m._id} 
                      className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-background/30 border group hover:bg-background/60 transition-colors select-text" 
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Icon icon="material-symbols:memory" className="text-primary/70 text-[17px] mt-0.5 shrink-0" />
                      <span className="text-[12px] text-text-secondary leading-relaxed flex-1">{m.content}</span>
                      <button
                        className="p-1 bg-transparent border-none cursor-pointer text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all rounded-md shrink-0 disabled:opacity-50 flex items-center justify-center"
                        onClick={() => handleDeleteMemory(m._id)}
                        disabled={deletingMemoryId === m._id}
                        title="Delete memory"
                      >
                        {deletingMemoryId === m._id ? (
                          <Icon icon="line-md:loading-twotone-loop" className="animate-spin text-xs" />
                        ) : (
                          <Icon icon="material-symbols:close" className="text-xs" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Confirm Clear Modal Container */}
                {confirmClearMemories && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border p-4 animate-in zoom-in-95 duration-150" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.01)" }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-text-primary">Clear all memories?</div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-normal">This will permanently delete all facts NovaMind has learned about you.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer"
                        onClick={() => setConfirmClearMemories(false)}
                        disabled={isDeletingAllMemories}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border-none bg-error text-white hover:bg-error/95 disabled:opacity-50 cursor-pointer"
                        onClick={handleDeleteAllMemories}
                        disabled={isDeletingAllMemories}
                      >
                        {isDeletingAllMemories ? "Clearing..." : "Clear"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="text-center pt-3 select-none border-t flex flex-col items-center gap-0.5 shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[10px] font-sans text-text-muted font-semibold tracking-wide">NovaMind v1.0.0</span>
          <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest">Powered by Gemini API</span>
        </div>
      </div>

      {/* Delete Account Portal Confirmation */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => {
              if (!isDeleting) {
                setShowDeleteConfirm(false);
                setDeletePassword("");
                setDeleteError("");
              }
            }}
          />
          <div className="relative bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 transform transition-all animate-in zoom-in-95 duration-200 select-none" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-error/10 text-error">
                <Icon icon="material-symbols:delete-outline" className="text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary mb-1.5 leading-snug">Delete account?</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">Are you sure you want to delete your account?</p>
                <input
                  type="password"
                  placeholder="Enter password to confirm"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError("");
                  }}
                  className="w-full bg-background border rounded-xl px-3 py-2 text-sm font-sans text-text-primary outline-none focus:border-error placeholder-text-muted"
                  style={{ borderColor: "var(--color-border)" }}
                  disabled={isDeleting}
                />

                {deleteError && <ErrorMessage message={deleteError} fullWidth onDismiss={() => setDeleteError("")} className="mt-2" />}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl border border-border bg-transparent cursor-pointer transition-colors duration-200"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm font-semibold text-white bg-error hover:bg-error/95 rounded-xl border-none cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
                disabled={isDeleting || !deletePassword}
              >
                {isDeleting && <Icon icon="line-md:loading-twotone-loop" className="text-sm animate-spin" />}
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showClearChatsConfirm}
        title="Clear all chats?"
        message="Are you sure you want to delete all chats? This action is permanent and cannot be undone."
        confirmText="Clear all"
        onConfirm={handleConfirmClearChats}
        onCancel={() => setShowClearChatsConfirm(false)}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirmText="Log out"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
}

export default SettingsPanel;
