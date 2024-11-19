require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Создаем WebSocket сервер

app.use(express.json());
app.use(cors());

// Настройки подключения к базе данных
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'users_db',
};

// Получение всех пользователей
app.get('/users', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, username FROM users');
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const connection = await mysql.createConnection(dbConfig);
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.execute(
            'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
            [email, username, hashedPassword]
        );
        await connection.end();
        res.status(201).json({ message: 'Регистрация успешна!', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'SECRET_KEY', {
            expiresIn: '1h',
        });
        await connection.end();
        res.json({ message: 'Logged in', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Настроим WebSocket на сервере
let users = {}; // Объект для хранения подключенных пользователей

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId; // Идентификатор пользователя, передаем через запрос

    // Сохраняем подключенного пользователя
    users[userId] = socket;

    // Обрабатываем касания
    socket.on('touch', (data) => {
        const { targetUserId, touchedBy } = data;

        // Отправляем уведомление целевому пользователю
        if (users[targetUserId]) {
            users[targetUserId].emit('touched', { touchedBy });
        }
    });

    // Отключаем пользователя при разрыве соединения
    socket.on('disconnect', () => {
        delete users[userId];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
