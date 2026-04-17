const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const http = require('http')
const dotenv = require("dotenv")
const authRoutes = require("./routes/auth");
const {Server} = require("socket.io")
const Messages = require("./models/Messages")
const User = require("./models/User")

dotenv.config();

const app = express();
const server = http.createServer(app); // creating a server to run the app


app.use(cors());
app.use(express.json());



const io = new Server(server, {
  cors: {
    origin: "*",
    
  },
  transports: ["websocket", "polling"]
});

mongoose.connect(process.env.MONGO_URL).then(()=>console.log("Mongodb connected.")).catch((error)=>console.log(error));

app.use("/auth",authRoutes);

//socket io logic
io.on("connection", (socket) => {
    console.log("User connected ", socket.id);

    socket.on("join", (username) => {
        socket.join(username);
    });

    socket.on("send_message", async (data) => {
        try {
            const { sender, receiver, message } = data;

            const newMessage = new Messages({
                sender,
                receiver,
                message,
                status: "sent"
            });

            await newMessage.save();

            io.to(receiver).emit("receive_message", newMessage);
            socket.emit("receive_message", newMessage);

        } catch (error) {
            console.error(error);
        }
    });

    socket.on("message_delivered", async (messageId) => {
        try {
            const message = await Messages.findByIdAndUpdate(
                messageId,
                { status: "delivered" },
                { new: true }
            );

            io.to(message.sender).emit("message_delivered_update", {
                messageId
            });

        } catch (error) {
            console.error(error);
        }
    });

    socket.on("message_read", async (messageId) => {
        try {
            const message = await Messages.findByIdAndUpdate(
                messageId,
                { status: "read" },
                { new: true }
            );

            io.to(message.sender).emit("message_read_update", {
                messageId
            });

        } catch (error) {
            console.error(error);
        }
    });

    socket.on("typing", ({ sender, receiver }) => {
        io.to(receiver).emit("typing", { sender });
    });

    socket.on("stop_typing", ({ sender, receiver }) => {
        io.to(receiver).emit("stop_typing", { sender });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected ", socket.id);
    });
});
    

app.get("/messages",async(req,res)=>{
    const {sender,receiver} = req.query;
    try {
        const messages = await Messages.find({
    $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
    ],
}).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
      res.status(500).json({message:"Error fetching messges"})
    }
    })

    app.get("/users",async(req,res)=>{
        const {currentUser} =req.query;
        try {
            const users =await User.find({username:{$ne:currentUser}})
            res.json(users)
        } catch (error) {
            res.status(500).json({message:"Error fetching users"})
        }
    })


const PORT = process.env.PORT || 5001;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`))
