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

// MONGODB BULUT BAĞLANTISI (Buraya kendi linkinizi tırnak içinde yazın)
const MONGO_URI = "mongodb+srv://erolreis53_db_user:JMTw3QXaDywlCNm3mongodb+srv://erolreis53_db_user:<db_password>@mead.czn10sn.mongodb.net/";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Veritabanına Başarıyla Bağlanıldı!"))
  .catch((err) => console.log("MongoDB Bağlantı Hatası:", err));

const JWT_SECRET = "gizli_anahtar_123456";

// KULLANICI ŞEMASI (Veritabanı Tablosu)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  tag: { type: String, required: true }, // #1234 formatı için
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  servers: [String],
  friends: [String]
});
const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.send('Discord Backend + MongoDB Calisiyor!');
});

// KAYIT OLMA (MongoDB Destekli + #ID Sistemi)
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Lütfen tüm alanları doldurun." });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı." });

    // Rastgele 4 haneli etiket oluştur (Örn: 4092)
    const tag = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, tag, email, password: hashedPassword });
    await newUser.save(); // Kullanıcıyı kalıcı olarak MongoDB'ye kaydet

    res.json({ message: `Kayıt başarılı! Discord ID: ${username}#${tag}` });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// GİRİŞ YAPMA (MongoDB Destekli)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); // Veritabanından kullanıcıyı bul

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "E-posta veya şifre hatalı!" });
    }

    const token = jwt.sign({ userId: user._id, username: user.username, tag: user.tag }, JWT_SECRET);
    res.json({ message: "Giriş başarılı!", token, username: user.username, tag: user.tag });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);
  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
