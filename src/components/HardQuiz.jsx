import React, { useState, useEffect, useCallback } from 'react';
import { database, auth } from '../firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const HardQuiz = () => {
    const [words, setWords] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [showAnswer, setShowAnswer] = useState(false);
    const [answerSubmitted, setAnswerSubmitted] = useState(false);
    const [questionSkipped, setQuestionSkipped] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWords = async () => {
            const user = auth.currentUser;
            if (user) {
                const wordsRef = ref(database, `user_words/${user.uid}`);
                onValue(wordsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const wordsArray = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
                        if (wordsArray.length < 1) {
                            setFeedback(`You need at least 1 word to play the hard quiz. Please add more words in the AddWord section.`);
                            setWords([]);
                        } else {
                            setWords(wordsArray);
                            generateQuestion(wordsArray);
                        }
                    } else {
                        setFeedback('No words found. Please add words in the AddWord section.');
                    }
                });
            } else {
                setFeedback('User is not authenticated.');
            }
        };

        fetchWords();
    }, []);

    const generateQuestion = useCallback((wordsArray) => {
        if (wordsArray.length > 0) {
            const randomWordIndex = Math.floor(Math.random() * wordsArray.length);
            const word = wordsArray[randomWordIndex];

            if (word.translations && word.translations.length > 0) {
                const correctTranslation = word.translations[Math.floor(Math.random() * word.translations.length)];

                setCurrentQuestion({
                    word: word.word,
                    wordLanguage: word.primaryLanguage,
                    correctTranslation: correctTranslation.translation,
                    targetLanguage: correctTranslation.language
                });

                setFeedback(''); // Clear feedback when generating a new question
                setUserAnswer('');
                setShowAnswer(false); // Ensure answer is not shown initially
                setAnswerSubmitted(false); // Reset answerSubmitted state
                setQuestionSkipped(false); // Reset questionSkipped state
            } else {
                setFeedback('Selected word has no translations.');
            }
        } else {
            setFeedback('No words available for quiz.');
        }
    }, []);

    const handleAnswerChange = (e) => {
        setUserAnswer(e.target.value);
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion) return;

        if (userAnswer.trim() === '') {
            setFeedback('Please enter a word.');
            return;
        }

        const userAnswerLower = userAnswer.trim().toLowerCase();
        const correctAnswerLower = currentQuestion.correctTranslation.toLowerCase();

        if (userAnswerLower === correctAnswerLower) {
            setFeedback('Correct! You have won 2 points.');
            await updateUserScore(2);
            setAnswerSubmitted(true);
            setShowAnswer(false);
            setQuestionSkipped(false);
        } else {
            setFeedback('Incorrect. Please try again.');
        }
    };

    const handleShowAnswer = async () => {
        if (!currentQuestion) return;

        // Set feedback before showing the answer
        setFeedback(`You have lost 2 points! The word "${currentQuestion.word}" (in ${getLanguageLabel(currentQuestion.wordLanguage)}) translates to "${currentQuestion.correctTranslation}" in ${getLanguageLabel(currentQuestion.targetLanguage)}.`);
        setShowAnswer(true);
        await updateUserScore(-2);
    };

    const handleSkipQuestion = async () => {
        if (!currentQuestion) return;

        await updateUserScore(-1);
        setFeedback('Question skipped. You have lost 1 point.');
        setShowAnswer(false); // Ensure answer is not shown when skipping
        setAnswerSubmitted(true);
        setQuestionSkipped(true);
    };

    const handleNextQuestion = () => {
        // Clear feedback and move to the next question
        setFeedback('');
        generateQuestion(words);
    };

    const updateUserScore = async (change) => {
        const user = auth.currentUser;
        if (user) {
            const userRef = ref(database, `users/${user.uid}`);
            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const currentData = snapshot.val();
                    const currentScore = currentData.score || 0;
                    await update(userRef, { score: currentScore + change });
                }
            } catch (error) {
                console.error('Error updating score:', error);
            }
        }
    };

    const getLanguageLabel = (value) => {
        const languageOptions = [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
            { value: 'it', label: 'Italiano' }
        ];
        const option = languageOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    };

    if (feedback && !currentQuestion) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-200 p-4">
                <div className="bg-white p-4 rounded shadow-md text-center">
                    <p className="text-lg text-red-500 font-extrabold">{feedback}</p>
                    <p className="mt-2">You need at least 1 word to play the hard quiz.</p>
                    <button
                        onClick={() => navigate('/add-word')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to AddWord
                    </button>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-200">
                <div className="text-center">
                    <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    <p className="mt-4 text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col p-4 bg-gray-900">
            <h1 className="text-3xl font-bold mb-4 text-center text-white">Hard Quiz</h1>
            <div className="flex-1 flex flex-col items-center justify-center text-white">
                <h2 className="text-xl mb-4 text-center">
                    How do you say "{currentQuestion.word}" (which is in {getLanguageLabel(currentQuestion.wordLanguage)}) in {getLanguageLabel(currentQuestion.targetLanguage)}?
                </h2>
                <input
                    type="text"
                    value={userAnswer}
                    onChange={handleAnswerChange}
                    placeholder={`Enter translation in ${getLanguageLabel(currentQuestion.targetLanguage)}`}
                    className="p-2 border border-gray-300 rounded mb-4 w-full max-w-md text-black"
                    disabled={showAnswer || answerSubmitted || questionSkipped} // Disable input if answer is submitted, answer is shown, or question is skipped
                />
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={handleSubmitAnswer}
                        className={`px-4 py-2 rounded text-white ${showAnswer || answerSubmitted || questionSkipped ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={showAnswer || answerSubmitted || questionSkipped} // Disable button if answer is submitted, answer is shown, or question is skipped
                    >
                        Submit Answer
                    </button>
                    <button
                        onClick={handleShowAnswer}
                        className={`px-4 py-2 rounded text-white ${showAnswer || answerSubmitted || questionSkipped ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        disabled={showAnswer || answerSubmitted || questionSkipped} // Disable button if answer is shown or question is skipped
                    >
                        Show Answer
                    </button>
                    <button
                        onClick={handleSkipQuestion}
                        className={`px-4 py-2 rounded text-white ${showAnswer || answerSubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                        disabled={showAnswer || answerSubmitted} // Disable button if answer is submitted or answer is shown
                    >
                        Skip Question
                    </button>
                </div>
                {feedback && <div className="text-center text-red-500 font-extrabold mb-4">{feedback}</div>}
                {(answerSubmitted || questionSkipped || showAnswer) && (
                    <div className="text-center mt-4">
                        <button
                            onClick={handleNextQuestion}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Next Question
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HardQuiz;
