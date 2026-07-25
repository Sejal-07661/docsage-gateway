require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

connectDB();

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/chat", chatRoutes);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("DocSage Gateway is alive!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});