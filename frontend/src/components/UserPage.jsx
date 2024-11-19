import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function UserPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]); // Состояние для всех пользователей
    const [currentUserId, setCurrentUserId] = useState(null); // Состояние для текущего пользователя
    const [isTouching, setIsTouching] = useState(false); // Состояние для отслеживания процесса касания
    const [touchTimeout, setTouchTimeout] = useState(null); // Таймер для сброса флага касания
    const [touchMessage, setTouchMessage] = useState(''); // Состояние для отображения сообщения о процессе касания
    const [timeLeft, setTimeLeft] = useState(0); // Состояние для отсчета времени

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login'); // Перенаправляем на страницу входа, если нет токена
        } else {
            const userId = localStorage.getItem('userId');
            setCurrentUserId(userId); // Сохраняем ID текущего пользователя

            const fetchUsers = async () => {
                try {
                    const res = await axios.get('http://localhost:3001/users'); // Запрос всех пользователей
                    setUsers(res.data);
                } catch (err) {
                    console.error(err);
                }
            };
            fetchUsers();
        }
    }, [navigate]);

    const handleTouch = (userId) => {
        if (isTouching) {
            setTouchMessage('Подождите, процесс касания еще не завершен!');
            return; // Если касание еще не завершено, не разрешаем повторное касание
        }

        if (userId === currentUserId) {
            alert('Вы не можете коснуться сами себя!');
            return; // Если это свой профиль, не разрешаем касаться
        }

        setIsTouching(true); // Устанавливаем флаг касания в true
        setTouchMessage('Процесс касания...'); // Показываем сообщение о процессе касания
        setTimeLeft(10); // Начинаем отсчет с 10 секунд

        // Вибрация устройства
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); // Вибрация устройства
        } else {
            alert('Ваше устройство не поддерживает вибрацию.');
        }

        // Звук при касании
        const touchSound = new Audio('../sounds/touchsound.mp3'); // Замените на путь к вашему звуковому файлу
        touchSound.play();

        // Таймер для отсчета времени
        const timeout = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timeout); // Останавливаем таймер, когда время истекает
                    setIsTouching(false);
                    setTouchMessage('Вы можете коснуться другого пользователя!'); // Сообщение после завершения касания
                    return 0;
                }
                return prevTime - 1; // Уменьшаем время на 1 каждую секунду
            });
        }, 1000); // Таймер обновляется каждую секунду

        setTouchTimeout(timeout); // Сохраняем таймер для последующего его сброса при необходимости
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login'); // Переход на страницу логина
    };

    // Фильтруем пользователей, исключая текущего
    const filteredUsers = users.filter(user => user.id !== currentUserId);

    // Добавим вывод для отладки
    console.log("currentUserId:", currentUserId);
    console.log("filteredUsers:", filteredUsers);

    return (
        <div className="container">
            <h1>Список пользователей</h1>
            {filteredUsers.length > 0 ? (
                <div className="user-list">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="user-item">
                            <h3>{user.username}</h3>
                            <button
                                onClick={() => handleTouch(user.id)}
                                className="touch-btn"
                                disabled={isTouching} // Деактивируем кнопку, пока идет касание
                            >
                                Коснуться
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Загрузка пользователей...</p>
            )}
            <br />
            {touchMessage && <p className="touch-message">{touchMessage}</p>} {/* Сообщение о процессе касания */}
            {isTouching && timeLeft > 0 && <p>Осталось времени: {timeLeft} секунд</p>} {/* Таймер */}
            <br />
            <button onClick={handleLogout} className="logout-btn">
                Выйти
            </button>
        </div>
    );
}

export default UserPage;
