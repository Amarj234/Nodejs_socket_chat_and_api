const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(express.json());
// Parse URL-encoded data (optional if you expect form data)
app.use(express.urlencoded({ extended: true }));
const mongoose = require('mongoose');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for testing. Restrict in production.
  },
});

app.use(cors());
let users = {}; 


// Connect to MongoDB
mongoose.connect('mongodb+srv://xenstag:zSx1crxK80QwhQ2A@xenett.okyggrr.mongodb.net/flutter_app?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err) => console.error('Could not connect to MongoDB...', err));

// Define a user schema for MongoDB
const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  socketId: { type: String, required: true }
});


const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users', // adjust if you have a different model name for users
      required: true,
    },
    userName: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users', // adjust if needed
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video'], // include any other types if needed
      default: 'text',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);


// Create a model from the schema
const User = mongoose.model('users', userSchema);
const Chat = mongoose.model('chats', MessageSchema);


io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);


   // Listen for user registration
  //  socket.on('register', async (username) => {
  //   try {
  //     // Check if the user already exists in the database
  //     let user = await User.findOne({ username });

  //     if (!user) {
  //       // Create new user and save it to the database
  //       user = new User({ username, socketId: socket.id });
  //       await user.save();
       
  //     }
  //     console.log(`${username} connected with socket ID ${socket.id}`);
  //     // Add user to the in-memory store
  //     users[username] = socket.id;

    
  //   } catch (err) {
  //     console.error('Error registering user:', err);
  //   }
  // });
  // Listen for messages from clients
  socket.on("message", (data) => {
    //const recipientSocketId = data.recipient;
    //if (recipientSocketId) {
      console.log('message listion:', data);
    io.emit('message', data);
    


  });

  socket.on("isRead", (data) => {
    //const recipientSocketId = data.recipient;
    //if (recipientSocketId) {
      console.log('message listion:', data);
    io.emit('isRead', data);
    


  });

  socket.on('disconnect', async() => {
    // Remove user from users list

    const user = await User.findOneAndDelete({ socketId: socket.id });
    if (user) {
      delete users[user.userName]; // Remove from in-memory store
      console.log('User disconnected:', user.userName);
    }
    console.log('User disconnected:', socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("WebSocket API is running...");
});


app.get("/client", (req, res) => {

    res.sendFile(path.join(__dirname, "client.html"));
});

app.post("/delete", async(req, res) => {
  console.log('delete:', req.body);
  const { userid } =req.body
  const user = await User.findOneAndDelete({ _id:userid });
  if(user){
  res.status(200).json({ message: 'User deleted successfully' });}else{

    res.status(400).json({ message: 'User not found' });
  }
});
  


app.post("/register",async (req, res) => {
  console.log('register:', req.body);
  try {
    const { userName, userid } = req.body;

    // Basic validation
    if (!userName || !userid) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
  
    // Check if user already exists
    const userExists = await User.findOne({ userName });
    if (userExists) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  
    // Create new user object (you may want to hash the password in a real app)
 let   user = new User({ userName, socketId: userid });
    user.save();
  
    // Respond with a success message and the new user info (without password)
    res.status(201).json({ 
      message: 'User registered successfully',
      user: { id: user.id, userName: user.userName }
    });
  } catch (err) {
    console.error('Error registering user:', err);
  }
});


app.post("/sendChat",async (req, res) => {
  console.log('sendChat:', req.body);
  try {
   let user =  Chat(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.log('error:', error);
    res.status(500).json({ error: "Failed to fetch items" });
  }

});




app.post("/isred",async (req, res) => {
  console.log('isred:', req.body);
  try {
   let user =await  Chat.updateOne({_id:req.body.id,}, { isRead: true });
    // await user.save();
 
    res.status(201).json(user);
  } catch (error) {
    console.log('error:', error);
    res.status(500).json({ error: "Failed to fetch items" });
  }

});

app.get("/getchat",async (req, res) => {
  console.log('getchat:', req.body.sender);
  try {
    const items = await Chat.find({ $or: [
      { sender: req.body.sender, receiver: req.body.receiver },
      { sender: req.body.receiver, receiver: req.body.sender }
    ]});
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});


app.get("/getuser",async (req, res) => {
  try {
    const items = await User.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
