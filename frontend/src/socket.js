import io from 'socket.io-client';

// Настроим WebSocket-соединение
export const setupSocket = (userId) => {
    // Подключаемся к серверу
    const socket = io('http://localhost:3000', {
        query: { userId }, // Отправляем userId в запросе для идентификации пользователя
    });

    return socket;
};
