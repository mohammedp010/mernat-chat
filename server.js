const express = require('express');
const { chats } = require("./data/data");
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = express();
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const path = require("path");
const cors = require('cors');



dotenv.config();
connectDB();
app.use(express.json());

// Enable CORS for all origins (for development)
app.use(cors());

// Or restrict CORS to your frontend's origin
app.use(cors({
  origin: '*', // Replace with your frontend origin
}));

// app.get('/api/chat', (req, res) => {
//     res.send(chats);
// });

// app.get('/api/chat/:id', (req, res) => {
//     // console.log(req.params.id);
//     const singleChat = chats.find((c) => c._id === req.params.id);
//     res.send(singleChat);
// });

app.use('/api/user',userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

app.set("view engine", "ejs");


//--DEPLOYMENT-----------

// const __dirname1 = path.resolve();

// if(process.env.NODE_ENV === 'production'){
//     app.use(express.static(path.join(__dirname1, "/frontend/build")));

//     app.get('*', (req,res) => {
//         res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"));
//     })
// }else{
//     app.get('/', (req, res) => {
//         res.send("API is Runnnning");
//     });
// }




//--DEPLOYMENT-----------
app.use(notFound)
app.use(errorHandler)
const PORT = process.env.PORT || 6000;
const server = app.listen(PORT,console.log(`Server listening on port ${PORT}`));

const io = require("socket.io")(server, {
    pingTimeOut: 60000,
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on('setup', (userData) => {
        socket.join(userData._id);
        // console.log(userData._id);
        socket.emit("connected");
    });
    socket.on('join chat', (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on('new message', (newMessageRecieved) => {
         var chat = newMessageRecieved.chat;
         if (!chat.users) return console.log("chat.users not defined");

         chat.users.forEach(user =>{
            if(user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message recieved", newMessageRecieved);
         });
    });

    socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    })
});