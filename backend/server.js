require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
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

        // Получаем всех пользователей
        const [rows] = await connection.execute('SELECT id, username FROM users');

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

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

        // Добавление пользователя в базу
        const [result] = await connection.execute(
            'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
            [email, username, hashedPassword]
        );

        await connection.end();
        res.status(201).json({ message: 'Регистрация успешна!', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email or username already exists' });
        }
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

        // Поиск пользователя в базе данных
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

// Получение данных пользователя
app.get('/user/:id', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Поиск пользователя по ID
        const [rows] = await connection.execute(
            'SELECT id, email, username FROM users WHERE id = ?',
            [req.params.id]
        );

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
