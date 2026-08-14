import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Chat() {
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [conversationId, setConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const [expandedSource, setExpandedSource] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const res = await fetch("/api/documents", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const completed = (data.documents || []).filter((d) => d.embeddingStatus === "completed");
                setDocuments(completed);
            } catch (err) {
                console.error("Failed to fetch documents", err);
            }
        };
        fetchDocs();
    }, []);

    const toggleDocSelection = (docId) => {
        setSelectedDocIds((prev) =>
            prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
        );
    };

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/chat/conversations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setConversations(Array.isArray(data.conversations) ? data.conversations : []);
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const loadConversation = async (id) => {
        try {
            const res = await fetch(`/api/chat/conversations/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setConversationId(data.conversation._id);
            setMessages(data.conversation.messages);
        } catch (err) {
            console.error("Failed to load conversation", err);
        }
    };

    const startNewChat = () => {
        setConversationId(null);
        setMessages([]);
        setError("");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!question.trim() || isStreaming) return;

        const userMessage = { role: "user", content: question };
        setMessages((prev) => [...prev, userMessage]);
        setQuestion("");
        setError("");
        setIsStreaming(true);

        setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [] }]);

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    question: userMessage.content,
                    conversationId,
                    documentIds: selectedDocIds,
                }),
            });

            if (!res.ok || !res.body) {
                throw new Error("Failed to get response from server");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const parts = buffer.split("\n\n");
                buffer = parts.pop();

                for (const part of parts) {
                    if (!part.trim()) continue;

                    const eventMatch = part.match(/^event: (.+)$/m);
                    const dataMatch = part.match(/^data: (.+)$/m);
                    if (!eventMatch || !dataMatch) continue;

                    const eventType = eventMatch[1];
                    const data = JSON.parse(dataMatch[1]);

                    if (eventType === "meta") {
                        setConversationId(data.conversationId);
                        setMessages((prev) => {
                            const updated = [...prev];
                            const last = { ...updated[updated.length - 1], sources: data.sources };
                            updated[updated.length - 1] = last;
                            return updated;
                        });
                    } else if (eventType === "token") {
                        setMessages((prev) => {
                            const updated = [...prev];
                            const last = {
                                ...updated[updated.length - 1],
                                content: updated[updated.length - 1].content + data.token,
                            };
                            updated[updated.length - 1] = last;
                            return updated;
                        });
                    } else if (eventType === "error") {
                        setError(data.message);
                    }
                }
            }

            fetchConversations();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="app-shell" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <nav className="app-nav">
                <div className="brand">DocSage</div>
                <div className="nav-links">
                    <button onClick={() => navigate("/dashboard")}>Dashboard</button>
                    <button onClick={() => navigate("/documents")}>Documents</button>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Sidebar */}
                <div style={{ width: "260px", borderRight: "1px solid var(--border)", padding: "16px", overflowY: "auto" }}>
                    <button
                        className="btn-primary"
                        onClick={startNewChat}
                        style={{ width: "100%", marginBottom: "20px" }}
                    >
                        + New Chat
                    </button>

                    <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                            SEARCH IN
                        </div>
                        {documents.length === 0 && (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>No documents yet</div>
                        )}
                        {documents.map((doc) => (
                            <label
                                key={doc._id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "0.8rem",
                                    padding: "6px 0",
                                    cursor: "pointer",
                                    color: "var(--text-muted)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDocIds.includes(doc._id)}
                                    onChange={() => toggleDocSelection(doc._id)}
                                />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {doc.originalName}
                                </span>
                            </label>
                        ))}
                        {selectedDocIds.length === 0 && documents.length > 0 && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "4px" }}>
                                None selected = search all
                            </div>
                        )}
                    </div>

                    <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginBottom: "8px", letterSpacing: "0.05em" }}>
                        HISTORY
                    </div>
                    {conversations.map((conv) => (
                        <div
                            key={conv._id}
                            onClick={() => loadConversation(conv._id)}
                            style={{
                                padding: "10px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                marginBottom: "4px",
                                background: conv._id === conversationId ? "var(--surface)" : "transparent",
                                fontSize: "0.85rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "var(--text-muted)",
                            }}
                        >
                            {conv.title}
                        </div>
                    ))}
                </div>

                {/* Main chat area */}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: "760px", margin: "0 auto" }}>
                    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: "center", color: "var(--text-faint)", marginTop: "80px" }}>
                                Ask a question about your documents to get started.
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    marginBottom: "18px",
                                    textAlign: msg.role === "user" ? "right" : "left",
                                }}
                            >
                                <div
                                    style={{
                                        display: "inline-block",
                                        background: msg.role === "user" ? "var(--accent)" : "var(--surface)",
                                        color: msg.role === "user" ? "white" : "var(--text)",
                                        padding: "12px 16px",
                                        borderRadius: "12px",
                                        maxWidth: "80%",
                                        whiteSpace: "pre-wrap",
                                        textAlign: "left",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    {msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div style={{ marginTop: "8px" }}>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            {msg.sources.map((src, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() =>
                                                        setExpandedSource(
                                                            expandedSource?.messageIndex === i && expandedSource?.sourceIndex === idx
                                                                ? null
                                                                : { messageIndex: i, sourceIndex: idx }
                                                        )
                                                    }
                                                    style={{
                                                        fontSize: "0.75rem",
                                                        padding: "5px 12px",
                                                        borderRadius: "14px",
                                                        border: "1px solid var(--border)",
                                                        background:
                                                            expandedSource?.messageIndex === i && expandedSource?.sourceIndex === idx
                                                                ? "var(--accent)"
                                                                : "var(--surface)",
                                                        color: "var(--text)",
                                                    }}
                                                >
                                                    [{idx + 1}] {src.documentName}
                                                </button>
                                            ))}
                                        </div>

                                        {msg.sources.map(
                                            (src, idx) =>
                                                expandedSource?.messageIndex === i &&
                                                expandedSource?.sourceIndex === idx && (
                                                    <div
                                                        key={`snippet-${idx}`}
                                                        style={{
                                                            marginTop: "8px",
                                                            padding: "14px",
                                                            background: "var(--bg)",
                                                            border: "1px solid var(--border)",
                                                            borderRadius: "10px",
                                                            fontSize: "0.85rem",
                                                            color: "var(--text-muted)",
                                                            maxHeight: "150px",
                                                            overflowY: "auto",
                                                            lineHeight: "1.5",
                                                        }}
                                                    >
                                                        <div style={{ fontSize: "0.75rem", color: "#818cf8", marginBottom: "6px" }}>
                                                            {src.documentName} — relevance {Math.round(src.similarityScore * 100)}%
                                                        </div>
                                                        {src.text}
                                                    </div>
                                                )
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && <p className="error-text" style={{ padding: "0 24px", textAlign: "left" }}>{error}</p>}

                    <form
                        onSubmit={handleAsk}
                        style={{ display: "flex", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border)" }}
                    >
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question about your documents..."
                            disabled={isStreaming}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: "10px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--text)",
                                fontSize: "0.9rem",
                            }}
                        />
                        <button type="submit" className="btn-primary" disabled={isStreaming}>
                            {isStreaming ? "..." : "Send"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Chat;