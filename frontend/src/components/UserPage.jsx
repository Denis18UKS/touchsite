import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupSocket } from '../socket'; // Импортируем setupSocket
import { fetchUsers } from '../api'; // Функция для получения списка пользователей

function UserPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isTouching, setIsTouching] = useState(false);
    const [touchMessage, setTouchMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [socket, setSocket] = useState(null);

    // Функция для отправки уведомлений
    const sendNotification = useCallback((title, options) => {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, options);

            // Проигрывание звука и вибрации при клике на уведомление
            notification.onclick = () => {
                window.focus();
                playTouchSound(); // Воспроизведение звука
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]); // Вибрация
                }
            };
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        } else {
            const userId = localStorage.getItem('userId');
            setCurrentUserId(userId);

            // Получаем список пользователей
            fetchUsers()
                .then((data) => setUsers(data))
                .catch((err) => console.error(err));

            // Настроим WebSocket-соединение
            const newSocket = setupSocket(userId);
            setSocket(newSocket);

            // Обработчик события "touched"
            newSocket.on('touched', (data) => {
                sendNotification(`Вас коснулся ${data.touchedBy}`, {
                    body: 'Нажмите для перехода на сайт',
                    data: { url: window.location.origin },
                });
            });

            // Очистим сокет при размонтировании компонента
            return () => newSocket.close();
        }
    }, [navigate, sendNotification]);

    // Обработчик для касания
    const handleTouch = (targetUserId) => {
        if (isTouching || targetUserId === currentUserId) return;

        setIsTouching(true);
        setTouchMessage('Касание начато...');
        setTimeLeft(10);

        // Проигрывание звука
        playTouchSound();

        // Отправляем событие на сервер
        if (socket) {
            socket.emit('touch', { targetUserId, touchedBy: currentUserId });
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsTouching(false);
                    setTouchMessage('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };  

    // Функция для воспроизведения звука
    const playTouchSound = () => {
        const touchSound = new Audio('../sounds/touchsound.mp3'); // Убедитесь, что путь правильный
        touchSound.play(); // Проигрываем звук
    };

    return (
        <div className="container">
            <h1>Список пользователей</h1>
            <div className="user-list">
                {users.map((user) => (
                    <div key={user.id} className="user-item">
                        <h3>{user.username}</h3>
                        <button
                            onClick={() => handleTouch(user.id)} // Касаемся конкретного пользователя
                            className="touch-btn"
                            disabled={isTouching}
                        >
                            Коснуться
                        </button>
                    </div>
                ))}
            </div>
            {touchMessage && <p>{touchMessage}</p>}
            {isTouching && <p>Осталось времени: {timeLeft} секунд</p>}
            <button
                onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                }}
                className="logout-btn"
            >
                Выйти
            </button>
        </div>
    );
}

export default UserPage;
