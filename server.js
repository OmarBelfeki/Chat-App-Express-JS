const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Message = require("./models/Message")

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json())

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.log("❌ MongoDB connection failed", error);
        process.exit(1);
    }
};

connectDb();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.get("/", (req, res) => {
    res.send("Chat app Backend is running ...")
});

app.get("/messages", async (req, res) => {
    try{
        const messages = await Message.find().sort({timestamp: 1});
        res.json(messages);
    }catch(err){
        res.status(500).json({error: err.message});
    }
});

app.post('/messages', async (req, res) => {
    try {
        const { username, message } = req.body;
        const newMessage = new Message({ username, message });
        await newMessage.save();

        io.emit('receiveMessage', newMessage);

        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

io.on("connection", (socket) => {
    console.log("🔵 A user connected: ", socket.id);
    socket.on("sendMessage", async (data) => {
        const newMessage = new Message({
            username: data.username,
            message: data.message
        });

        await newMessage.save();

        io.emit("receiveMessage", newMessage);
    });

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected: ", socket.id);
    });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})