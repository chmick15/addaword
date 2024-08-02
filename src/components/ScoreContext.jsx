import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, database } from '../firebase';
import { ref, onValue } from 'firebase/database';

const ScoreContext = createContext();

export const useScore = () => useContext(ScoreContext);

export const ScoreProvider = ({ children }) => {
    const [score, setScore] = useState(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const userRef = ref(database, `users/${user.uid}`);
            const unsubscribe = onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data && data.score !== undefined) {
                    setScore(data.score);
                } else {
                    setScore(0); // Initialiser le score à 0 si non défini
                }
            });

            return () => unsubscribe();
        }
    }, []);

    return (
        <ScoreContext.Provider value={{ score, setScore }}>
            {children}
        </ScoreContext.Provider>
    );
};
