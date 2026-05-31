import { useEffect, useState } from "react";
import API from "../services/api";

const LEVEL_CHOICES = [
  { value: "basic_7_9",  label: "Basic 7-9"  },
  { value: "basic_1_6",  label: "Basic 1-6"  },
  { value: "nursery_kg", label: "Nursery/KG" },
];

const LEVEL_BADGE = {
  basic_7_9:  "bg-blue-100   text-blue-800",
  basic_1_6:  "bg-green-100  text-green-800",
  nursery_kg: "bg-purple-100 text-purple-800",
};

const Classes = () => {
  const [classes, setClasses]   = useState([]);
  const [name, setName]         = useState("");
  const [section, setSection]   = useState("");
  const [level, setLevel]       = useState("basic_7_9");
  const [editingId, setEditingId]     = useState(null);
  const [editName, setEditName]       = useState("");
  const [editSection, setEditSection] = useState("");
  const [editLevel, setEditLevel]     = useState("basic_7_9");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const res = await API.get("/classes/");
      setClasses(res.data.results || res.data);
    } catch { setError("Failed to load classes."); }
  };

  const createClass = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await API.post("/classes/", { name, section, level });
      setName(""); setSection(""); setLevel("basic_7_9");
      setSuccess("Class created successfully.");
      loadClasses();
    } catch { setError("Failed to create class."); }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSection(c.section || "");
    setEditLevel(c.level || "basic_7_9");
  };

  const saveEdit = async (id) => {
    setError(""); setSuccess("");
    try {
      await API.patch(`/classes/${id}/`, {
        name:    editName,
        section: editSection,
        level:   editLevel,
      });
      setEditingId(null);
      setSuccess("Class updated successfully.");
      loadClasses();
    } catch { setError("Failed to update class."); }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Delete this class? This cannot be undone.")) return;
    setError(""); setSuccess("");
    try {
      await API.delete(`/classes/${id}/`);
      setSuccess("Class deleted.");
      loadClasses();
    } catch { setError("Failed to delete class."); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Classes</h1>

      {error   && <div className="mb-4 p-3 bg-red-100   text-red-700   border border-red-300   rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">{success}</div>}

      {/* Add class form */}
      <form onSubmit={createClass} className="mb-6 flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Class Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Basic 1"
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Section</label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-24"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Level <span className="text-red-500">*</span></label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {LEVEL_CHOICES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Add Class
        </button>
      </form>

      {/* Classes table */}
      <div className="overflow-x-auto">
        <table className="w-full border rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Class</th>
              <th className="p-2 text-center">Section</th>
              <th className="p-2 text-center">Level</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c, i) => (
              <tr key={c.id} className={`border-t ${i % 2 === 0 ? "" : "bg-gray-50"}`}>

                {editingId === c.id ? (
                  // ── Edit row ──
                  <>
                    <td className="p-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border p-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        value={editSection}
                        onChange={(e) => setEditSection(e.target.value)}
                        className="border p-1 rounded w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="A"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <select
                        value={editLevel}
                        onChange={(e) => setEditLevel(e.target.value)}
                        className="border p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {LEVEL_CHOICES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => saveEdit(c.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="border px-3 py-1 rounded text-xs hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // ── Display row ──
                  <>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2 text-center text-gray-500">{c.section || "-"}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE[c.level] || "bg-gray-100 text-gray-700"}`}>
                        {LEVEL_CHOICES.find((l) => l.value === c.level)?.label || c.level || "-"}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => startEdit(c)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteClass(c.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}

              </tr>
            ))}

            {classes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  No classes found. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Classes;