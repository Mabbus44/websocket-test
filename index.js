console.log("index.js started");
require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const socketIO = require("socket.io");
const path = require("path");
const PORT = process.env.PORT || 3000;
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:abc123@localhost:5432/local_chat_test",
  ssl: process.env.DATABASE_URL ? true : false,
  /*connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }*/
});

const server = express()
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (req, res) => res.render("pages/chat"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);
io.on("connection", (socket) => {
  console.log(`Client connected ${socket.id}`);
  getChatHistory(socket);
  socket.on("disconnect", () => console.log(`Client disconnected ${socket.id}`));
  socket.on("newMessage", saveMessage);
});

setInterval(() => io.emit("time", new Date().toTimeString()), 1000);
console.log("index.js finished");

async function getChatHistory(socket) {
  console.log("getChatHistory");
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM chat");
    let results = result ? result.rows : null;
    client.release();
    socket.emit("chatHistory", JSON.stringify(results));
  } catch (err) {
    console.error(err);
    socket.emit("chatHistory", "error");
  }
}

async function saveMessage(userName, message) {
  console.log(`saveMessage ${message}`);
  try {
    const client = await pool.connect();
    await client.query(`INSERT INTO chat (user_name, message) VALUES ('${userName}', '${message}');`);
    client.release();
    getChatHistory(this);
  } catch (err) {
    console.error(err);
  }
  console.log("messageSaved");
}
