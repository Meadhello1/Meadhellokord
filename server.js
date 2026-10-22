const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// CORS ve JSON İzinleri
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const JWT_SECRET = "gizli_anahtar_123456";
const users = [];

// Ana Sayfa Test İstegi (Render Saglik Kontrolu İcin)
app.get('/', (req, res) => {
  res.send('Discord Backend Sunucusu Calisiyor!');
});

// KAYIT OLMA
app.post('/api/register', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// GİRİŞ YAPMA
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "E-posta veya şifre hatalı!" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ message: "Giriş başarılı!", token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// SOCKET.IO MESAJLAŞMA
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda başarıyla çalışıyor!`);
});
