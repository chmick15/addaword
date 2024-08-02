import React, { useState } from 'react';
import { auth, database } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            if (isLogin) {
                // Login process
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Check if user data exists
                const userRef = ref(database, `users/${user.uid}`);
                const snapshot = await get(userRef);
                if (!snapshot.exists()) {
                    // Initialize user data if it does not exist
                    await set(userRef, {
                        name: user.displayName || 'Unknown',
                        score: 0
                    });
                }

                console.log('User signed in:', user);
                navigate('/word-list');
            } else {
                // Sign up process
                if (!username.trim()) {
                    setError('Username is required and cannot be empty.');
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save the username and other details in the database
                await set(ref(database, `users/${user.uid}`), {
                    name: username,
                    score: 0
                });

                // Create an empty list of words for the user
                await set(ref(database, `users/${user.uid}/words`), {});

                // Optionally update the user's profile with the username
                await user.updateProfile({
                    displayName: username
                });

                console.log('User registered:', user);
                navigate('/word-list');
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            setError(error.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8">
                <h2 className="text-2xl font-bold text-center">
                    {isLogin ? 'Login' : 'Sign Up'}
                </h2>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                required
                                className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <p className="text-sm text-center text-purple-400">
                                <strong>Note:</strong> This username is final and cannot be changed.
                            </p>
                            {username.trim() === '' && (
                                <p className="text-red-500 text-center">Username is required.</p>
                            )}
                        </>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full bg-gray-700 hover:bg-gray-900 text-white font-bold py-3 rounded-lg mt-4 transition duration-300 ease-in-out transform hover:scale-105"
                >
                    {isLogin ? 'Create an account TEST' : 'Login with an existing account'}
                </button>
            </div>
        </div>
    );
};

export default Auth;
