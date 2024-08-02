import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useScore } from './ScoreContext'; // Import useScore

const NavBar = () => {
    const [userName, setUserName] = useState('');
    const { score, setScore } = useScore(); // Use the score from context
    const navigate = useNavigate();
    const location = useLocation(); // Hook to get the current location
    const [menuOpen, setMenuOpen] = useState(false); // État pour gérer l'ouverture du menu

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const userRef = ref(database, `users/${user.uid}`);
            onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setUserName(data.name || 'User');
                    setScore(data.score || 0);
                }
            });
        }
    }, [setScore]);

    // Close menu when location changes
    useEffect(() => {
        setMenuOpen(false);
    }, [location]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("User signed out");
            navigate('/auth'); // Redirect to authentication page after logout
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const isActive = (path) => location.pathname === path; // Determine if the current path is active

    return (
        <nav className="bg-gray-800 text-white p-4 flex flex-col md:flex-row justify-between items-center">
            <div className="flex justify-between w-full md:w-auto">
                <div className="text-center md:text-left">
                    <p className="text-yellow-300 font-extrabold text-2xl">Welcome {userName}!</p>
                    <p className="text-yellow-200 text-xl font-extrabold">Score: {score}</p>
                </div>
                <button
                    className="md:hidden bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg"
                    onClick={toggleMenu}
                >
                    Menu
                </button>
            </div>
            <ul className={`flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 mt-4 md:mt-0 ${menuOpen ? 'flex' : 'hidden'} md:flex`}>
                <li>
                    <Link
                        to="/add-word"
                        className={`text-lg font-bold ${isActive('/add-word') ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-600'}`}
                        onClick={(e) => isActive('/add-word') && e.preventDefault()}
                    >
                        Add Word
                    </Link>
                </li>
                <li>
                    <Link
                        to="/word-list"
                        className={`text-lg font-bold ${isActive('/word-list') ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-600'}`}
                        onClick={(e) => isActive('/word-list') && e.preventDefault()}
                    >
                        Word List
                    </Link>
                </li>
                <li>
                    <Link
                        to="/quiz"
                        className={`text-lg font-bold ${isActive('/quiz') ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-600'}`}
                        onClick={(e) => isActive('/quiz') && e.preventDefault()}
                    >
                        Quiz
                    </Link>
                </li>
                <li>
                    <Link
                        to="/hard-quiz"
                        className={`text-lg font-bold ${isActive('/hard-quiz') ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-600'}`}
                        onClick={(e) => isActive('/hard-quiz') && e.preventDefault()}
                    >
                        Hard Quiz
                    </Link>
                </li>
                <li>
                    <button
                        onClick={() => { handleLogout(); toggleMenu(); }}
                        className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Logout
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default NavBar;
