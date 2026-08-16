const express = require("express");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("DocSage Gateway is alive!");
});

app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/chat", chatRoutes);

module.exports = app;