import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Documents() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to load documents. Please log in again.");
        return;
      }

      const data = await res.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
      setError("Something went wrong loading documents.");
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setFile(null);
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;

    setActionLoadingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete document");
      }

      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReprocess = async (docId) => {
    setActionLoadingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/reprocess`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to reprocess document");
      }

      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">DocSage</div>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/chat")}>Chat</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="page-content">
        <h1>Documents</h1>

        <form onSubmit={handleUpload} style={{ display: "flex", gap: "10px", margin: "24px 0" }}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button type="submit" className="btn-primary" disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {error && <p className="error-text" style={{ textAlign: "left" }}>{error}</p>}

        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc._id} className="doc-item">
              <span>{doc.originalName}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`doc-status ${doc.embeddingStatus}`}>{doc.embeddingStatus}</span>
                {doc.embeddingStatus === "failed" && (
                  <button
                    onClick={() => handleReprocess(doc._id)}
                    disabled={actionLoadingId === doc._id}
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-muted)",
                    }}
                  >
                    {actionLoadingId === doc._id ? "..." : "Retry"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc._id)}
                  disabled={actionLoadingId === doc._id}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--danger)",
                  }}
                >
                  {actionLoadingId === doc._id ? "..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
          {documents.length === 0 && <p style={{ color: "var(--text-muted)" }}>No documents uploaded yet.</p>}
        </ul>
      </div>
    </div>
  );
}

export default Documents;