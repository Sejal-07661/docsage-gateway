import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">DocSage</div>
        <div className="nav-links">
          <button onClick={() => navigate("/documents")}>Documents</button>
          <button onClick={() => navigate("/chat")}>Chat</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="page-content">
        <h1>Dashboard</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>
          You're logged in. Upload documents and start chatting with your AI assistant.
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button className="btn-primary" onClick={() => navigate("/documents")}>
            Manage Documents
          </button>
          <button className="btn-primary" onClick={() => navigate("/chat")}>
            Start Chatting
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;