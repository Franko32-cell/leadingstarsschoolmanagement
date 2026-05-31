/**
 * AnnouncementsFeed — shared read-only feed for Student and Teacher portals.
 *
 * Props:
 *   audience: "students" | "teachers"  — filters announcements server-side
 */
import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRIORITY_STYLES = {
  normal:   { border: "border-l-gray-300",  badge: "bg-gray-100   text-gray-600   ring-gray-200",  icon: "📢" },
  urgent:   { border: "border-l-amber-400", badge: "bg-amber-50   text-amber-700  ring-amber-200", icon: "⚠️" },
  critical: { border: "border-l-red-500",   badge: "bg-red-50     text-red-700    ring-red-200",   icon: "🚨" },
};

const AUDIENCE_BADGE = {
  all:      "bg-blue-50   text-blue-700   ring-blue-200",
  students: "bg-green-50  text-green-700  ring-green-200",
  teachers: "bg-violet-50 text-violet-700 ring-violet-200",
  parents:  "bg-orange-50 text-orange-700 ring-orange-200",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const timeAgo = (iso) => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatExpiry = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─────────────────────────────────────────────
// Single card
// ─────────────────────────────────────────────

const FeedCard = ({ ann }) => {
  const [expanded, setExpanded] = useState(false);
  const st      = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.normal;
  const isLong  = ann.message.length > 200;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${st.border}`}>
      <div className="px-5 py-4">

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {ann.is_pinned && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-200">
                📌 Pinned
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${st.badge}`}>
              {st.icon} {ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${AUDIENCE_BADGE[ann.audience] || AUDIENCE_BADGE.all}`}>
              {ann.audience_label || ann.audience}
            </span>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(ann.created_at)}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 text-base mb-1 leading-snug">{ann.title}</h3>

        {/* Message */}
        <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${!expanded && isLong ? "line-clamp-3" : ""}`}>
          {ann.message}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1.5 font-medium"
          >
            {expanded ? "Show less ▲" : "Read more ▼"}
          </button>
        )}

        {/* Expiry */}
        {ann.expires_at && (
          <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1">
            <span>⏳</span> Expires {formatExpiry(ann.expires_at)}
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main feed
// ─────────────────────────────────────────────

const AnnouncementsFeed = ({ audience }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [filter, setFilter]               = useState("all"); // "all" | "normal" | "urgent" | "critical"

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // audience param filters to "all" + the specific audience on the server
      const res = await API.get(`/announcements/?audience=${audience}`);
      setAnnouncements(res.data.results ?? res.data);
    } catch {
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? announcements
    : announcements.filter((a) => a.priority === filter);

  const pinned   = filtered.filter((a) => a.is_pinned);
  const unpinned = filtered.filter((a) => !a.is_pinned);

  const counts = {
    urgent:   announcements.filter((a) => a.priority === "urgent").length,
    critical: announcements.filter((a) => a.priority === "critical").length,
  };

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {counts.critical > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full ring-1 ring-red-200">
              🚨 {counts.critical} Critical
            </span>
          )}
          {counts.urgent > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full ring-1 ring-amber-200">
              ⚠️ {counts.urgent} Urgent
            </span>
          )}
          {counts.critical === 0 && counts.urgent === 0 && (
            <span className="text-xs text-gray-400">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Priority filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", "critical", "urgent", "normal"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                filter === p
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-14 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-3xl mb-2">📢</p>
          <p className="text-sm">Loading announcements…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-14 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">
            {filter !== "all"
              ? `No ${filter} announcements.`
              : "No announcements right now. Check back later."}
          </p>
        </div>
      )}

      {/* Pinned */}
      {!loading && pinned.length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">📌 Pinned</p>
          {pinned.map((a) => <FeedCard key={a.id} ann={a} />)}
          {unpinned.length > 0 && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 pt-1">Recent</p>
          )}
        </>
      )}

      {/* Unpinned */}
      {!loading && unpinned.map((a) => <FeedCard key={a.id} ann={a} />)}
    </div>
  );
};

export default AnnouncementsFeed;