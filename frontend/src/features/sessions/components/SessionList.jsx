// NovaMind — frontend/src/components/sidebar/SessionList.jsx

import dayjs from "dayjs";
import SessionItem from "./SessionItem.jsx";
import { useChatContext } from "../../chat/context/ChatContext.jsx";

function getGroup(createdAt) {
  const now = dayjs();
  const date = dayjs(createdAt);

  if (date.isSame(now, "day")) {
    return "Today";
  }

  // Calculate start of the last Monday
  const dayOfWeek = now.day(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = now.subtract(daysSinceMonday, "day").startOf("day");

  if (date.isAfter(lastMonday) || date.isSame(lastMonday)) {
    return "This Week";
  }

  return "Older Chats";
}

const GROUP_ORDER = ["Today", "This Week", "Older Chats"];

function SessionList({ filteredSessions = [], searchQuery = "", isSearchActive = false }) {
  const { sessionsList } = useChatContext();

  // If search is active, render flat list of filtered sessions
  if (isSearchActive) {
    if (filteredSessions.length === 0) {
      return (
        <div className="text-center text-xs py-8 select-none" style={{ color: "var(--color-text-muted)" }}>
          No chats found
        </div>
      );
    }

    return (
      <nav className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5 scrollbar-thin">
        {filteredSessions.map((session) => (
          <SessionItem key={session.id} session={session} searchQuery={searchQuery} />
        ))}
      </nav>
    );
  }

  // Normal grouped rendering
  const groups = {};
  sessionsList.forEach((session) => {
    const group = getGroup(session.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(session);
  });

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5 scrollbar-thin">
      {GROUP_ORDER.map((groupName) => {
        if (!groups[groupName] || groups[groupName].length === 0) return null;
        return (
          <div key={groupName} className="mb-1">
            {/* Section Header */}
            <div
              className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider select-none"
              style={{ color: "var(--color-text-muted)", letterSpacing: "0.06em", fontSize: "11px" }}
            >
              {groupName}
            </div>

            {/* Session Rows */}
            {groups[groupName].map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>
        );
      })}

      {sessionsList.length === 0 && (
        <div className="text-center text-xs py-8 select-none" style={{ color: "var(--color-text-muted)" }}>
          No chats yet. Start a new one!
        </div>
      )}
    </nav>
  );
}

export default SessionList;
