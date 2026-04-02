"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Project = { id: number; name: string };
type Entry = {
  id: number;
  projectId: number;
  projectName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  comment: string | null;
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null, liveSeconds?: number) {
  if (liveSeconds !== undefined) {
    const h = Math.floor(liveSeconds / 3600);
    const m = Math.floor((liveSeconds % 3600) / 60);
    const s = liveSeconds % 60;
    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  }
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Returns "YYYY-MM-DD" in local time
function localDateStr(d: Date) {
  return d.toLocaleDateString("sv"); // sv locale gives YYYY-MM-DD
}

// Returns "HH:MM" in local time
function localTimeStr(d: Date) {
  return d.toLocaleTimeString("sv", { hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry form state
  const [showManual, setShowManual] = useState(false);
  const [manualProject, setManualProject] = useState<number | "">("");
  const [manualDate, setManualDate] = useState(localDateStr(new Date()));
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualComment, setManualComment] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  }, []);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/entries?filter=today");
    const data = await res.json();
    setEntries(data);
    const active = data.find((e: Entry) => e.endTime === null);
    setActiveEntry(active ?? null);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchEntries();
  }, [fetchProjects, fetchEntries]);

  // Live timer tick
  useEffect(() => {
    if (activeEntry) {
      const start = new Date(activeEntry.startTime).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeEntry]);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      if (activeEntry) {
        await fetch("/api/timer/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        });
        setComment("");
      } else {
        if (!selectedProject) {
          alert("Please select a project first.");
          return;
        }
        await fetch("/api/timer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProject }),
        });
      }
      await fetchEntries();
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveComment(id: number) {
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: editingComment }),
    });
    setEditingId(null);
    setEditingComment("");
    await fetchEntries();
  }

  async function handleAddProject() {
    if (!newProjectName.trim()) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName }),
    });
    setNewProjectName("");
    setShowNewProject(false);
    await fetchProjects();
  }

  async function handleManualSave() {
    setManualError("");
    if (!manualProject) return setManualError("Velg prosjekt.");
    if (!manualStart) return setManualError("Angi starttid.");
    if (!manualEnd) return setManualError("Angi sluttid.");

    const startTime = `${manualDate}T${manualStart}`;
    const endTime = `${manualDate}T${manualEnd}`;

    if (new Date(endTime) <= new Date(startTime)) {
      return setManualError("Sluttid må være etter starttid.");
    }

    setManualLoading(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: manualProject,
          startTime,
          endTime,
          comment: manualComment,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        return setManualError(err.error ?? "Noe gikk galt.");
      }
      // Reset form
      setManualProject("");
      setManualDate(localDateStr(new Date()));
      setManualStart("");
      setManualEnd("");
      setManualComment("");
      setShowManual(false);
      await fetchEntries();
    } finally {
      setManualLoading(false);
    }
  }

  const isRunning = !!activeEntry;
  const totalMinutes = entries
    .filter((e) => e.durationMinutes != null)
    .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">TimeTracker</h1>
        <a
          href="/api/export"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Export CSV
        </a>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Timer Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Project selector */}
          {!isRunning && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prosjekt
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedProject}
                  onChange={(e) =>
                    setSelectedProject(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Velg prosjekt…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewProject(!showNewProject)}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  + Ny
                </button>
              </div>
              {showNewProject && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                    placeholder="Prosjektnavn"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleAddProject}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Legg til
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Running project label */}
          {isRunning && (
            <div className="mb-4 text-sm text-gray-600">
              Sporer:{" "}
              <span className="font-semibold text-gray-900">
                {activeEntry.projectName}
              </span>
            </div>
          )}

          {/* Live timer display */}
          {isRunning && (
            <div className="text-5xl font-mono font-bold text-gray-900 text-center mb-5 tabular-nums">
              {formatDuration(null, elapsed)}
            </div>
          )}

          {/* Comment field (shown when timer is running) */}
          {isRunning && (
            <div className="mb-4">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Hva jobber du med? (valgfritt)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Start / Stop button */}
          <button
            onClick={handleToggle}
            disabled={loading || (!isRunning && !selectedProject)}
            className={`w-full py-3 rounded-lg font-semibold text-base transition-colors ${
              isRunning
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {loading ? "…" : isRunning ? "Stopp timer" : "Start timer"}
          </button>
        </div>

        {/* Manual entry */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => {
              setShowManual(!showManual);
              setManualError("");
              if (!showManual) {
                setManualDate(localDateStr(new Date()));
                const now = new Date();
                setManualEnd(localTimeStr(now));
                setManualStart(
                  localTimeStr(new Date(now.getTime() - 60 * 60 * 1000))
                );
              }
            }}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <span>+ Registrer tid manuelt</span>
            <span className="text-gray-400">{showManual ? "▲" : "▼"}</span>
          </button>

          {showManual && (
            <div className="px-6 pb-6 space-y-3 border-t border-gray-100 pt-4">
              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Prosjekt
                </label>
                <select
                  value={manualProject}
                  onChange={(e) =>
                    setManualProject(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Velg prosjekt…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Dato
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start / End time */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fra
                  </label>
                  <input
                    type="time"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Til
                  </label>
                  <input
                    type="time"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Kommentar (valgfritt)
                </label>
                <input
                  type="text"
                  value={manualComment}
                  onChange={(e) => setManualComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSave()}
                  placeholder="Hva ble gjort?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {manualError && (
                <p className="text-xs text-red-600">{manualError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleManualSave}
                  disabled={manualLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
                >
                  {manualLoading ? "Lagrer…" : "Lagre"}
                </button>
                <button
                  onClick={() => {
                    setShowManual(false);
                    setManualError("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Today's entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">I dag</h2>
            <span className="text-sm text-gray-500">
              Totalt: {formatDuration(totalMinutes)}
            </span>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              Ingen registreringer i dag.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <li key={entry.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {entry.projectName}
                        </span>
                        {!entry.endTime && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTime(entry.startTime)}
                        {entry.endTime && ` → ${formatTime(entry.endTime)}`}
                      </div>
                      {editingId === entry.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editingComment}
                            onChange={(e) => setEditingComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveComment(entry.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveComment(entry.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Lagre
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            Avbryt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditingComment(entry.comment ?? "");
                          }}
                          className="mt-1 text-xs text-left text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          {entry.comment ? (
                            <span className="italic">{entry.comment}</span>
                          ) : (
                            <span className="text-gray-400">
                              + Legg til kommentar
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-mono text-gray-700 shrink-0">
                      {entry.endTime
                        ? formatDuration(entry.durationMinutes)
                        : formatDuration(null, elapsed)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
