import { Link } from 'react-router-dom';

function Navbar() {
    const isAuthenticated = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login'; // Перенаправляем на страницу логина
    };

    return (
        <nav className="navbar">
            <ul>
                {isAuthenticated ? (
                    <>
                        <li><Link to={`/user/${localStorage.getItem('userId')}`}>User Page</Link></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/register">Register</Link></li>
                        <li><Link to="/login">Login</Link></li>
                    </>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;
