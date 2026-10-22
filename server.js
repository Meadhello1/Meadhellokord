const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // <-- YENİ EKLENEN SATIR

const app = express();

// TARAYICI ENGELİNİ KALDIRAN KRİTİK AYARLAR:
app.use(cors()); 
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] } 
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = "gizli_anahtar_123456";

// Geçici bellek veritabanı (Gerçek veritabanı bağlayana kadar veriler burada tutulur)
const users = [];

// 1. KAYIT OLMA (REGISTER)
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), username, email, password: hashedPassword };
  users.push(newUser);

  res.json({ message: "Kayıt başarılı! Şimdi giriş yapabilirsiniz." });
});

// 2. GİRİŞ YAPMA (LOGIN)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: "E-posta veya şifre hatalı!" });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
  res.json({ message: "Giriş başarılı!", token, username: user.username });
});

// SOCKET.IO MESAJLAŞMA
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
