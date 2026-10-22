const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// MONGODB BULUT BAĞLANTISI (Kendi linkinizi buraya yazın)
const MONGO_URI = "mongodb+srv://erolreis53_db_user:<db_password>@mead.czn10sn.mongodb.net/";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Veritabanına Başarıyla Bağlanıldı!"))
  .catch((err) => console.log("MongoDB Bağlantı Hatası:", err));

const JWT_SECRET = "gizli_anahtar_123456";

// KULLANICI ŞEMASI
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  tag: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  servers: [String],
  friends: [String]
});
const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => res.send('Discord Backend + Odalar Çalışıyor!'));

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Bu e-posta zaten kayıtlı." });

    const tag = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, tag, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: `Kayıt başarılı! Discord ID: ${username}#${tag}` });
  } catch (err) { res.status(500).json({ error: "Sunucu hatası." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Hatalı giriş!" });
    
    const token = jwt.sign({ userId: user._id, username: user.username, tag: user.tag }, JWT_SECRET);
    res.json({ message: "Giriş başarılı!", token, username: user.username, tag: user.tag });
  } catch (err) { res.status(500).json({ error: "Sunucu hatası." }); }
});

// YENİ: SOCKET.IO ODA MANTIĞI
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  // Kullanıcı bir odaya girmek istediğinde
  socket.on('join_room', (roomName) => {
    // Önceki odalarından çık
    Array.from(socket.rooms).forEach(room => {
      if(room !== socket.id) socket.leave(room); 
    });
    
    socket.join(roomName);
    console.log(`Kullanıcı ${roomName} odasına katıldı.`);
  });

  // Kullanıcı odaya mesaj gönderdiğinde
  socket.on('send_message', (data) => {
    // data nesnesinin içinde 'room' bilgisi de gelecek
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => console.log('Kullanıcı ayrıldı:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor...`));
