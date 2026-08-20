const express = require("express");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/chat", chatRoutes);

// Serve the built React frontend in production
app.use(express.static(path.join(__dirname, "client/dist")));

// Any route not matched above (and not an API route) falls through to
// React's index.html, so client-side routing (React Router) works on refresh
app.get(/^(?!\/(auth|documents|chat)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});

module.exports = app;