import React, { useState, useEffect, useCallback } from 'react';
import { database, auth } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useScore } from './ScoreContext'; // Assurez-vous d'importer le contexte

const Quiz = () => {
    const [words, setWords] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [answerSubmitted, setAnswerSubmitted] = useState(false);
    const navigate = useNavigate();
    const { score, setScore } = useScore(); // Utilisez le contexte pour le score

    useEffect(() => {
        const fetchWords = async () => {
            const user = auth.currentUser;
            if (user) {
                const wordsRef = ref(database, `user_words/${user.uid}`);
                onValue(wordsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const wordsArray = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
                        if (wordsArray.length < 4) {
                            setFeedback('You need at least 4 words to play the quiz. Please add more words in the Add Word section.');
                            setWords([]);
                        } else {
                            setWords(wordsArray);
                            generateQuestion(wordsArray);
                        }
                    } else {
                        setFeedback('No words found. Please add words in the Add Word section.');
                    }
                });
            } else {
                setFeedback('User is not authenticated.');
            }
        };

        fetchWords();
    }, []);

    const generateQuestion = useCallback((wordsArray) => {
        if (wordsArray.length >= 4) {
            // Select a random word for the question
            const randomWordIndex = Math.floor(Math.random() * wordsArray.length);
            const questionWord = wordsArray[randomWordIndex];

            // Select the correct translation
            if (questionWord.translations && questionWord.translations.length > 0) {
                const correctTranslation = questionWord.translations[Math.floor(Math.random() * questionWord.translations.length)].translation;

                // Select 3 random incorrect answers
                const incorrectAnswers = [];
                while (incorrectAnswers.length < 3) {
                    const randomIndex = Math.floor(Math.random() * wordsArray.length);
                    const wrongWord = wordsArray[randomIndex];
                    if (wrongWord.id !== questionWord.id && wrongWord.translations.length > 0) {
                        const wrongTranslation = wrongWord.translations[Math.floor(Math.random() * wrongWord.translations.length)].translation;
                        if (!incorrectAnswers.includes(wrongTranslation)) {
                            incorrectAnswers.push(wrongTranslation);
                        }
                    }
                }

                // Shuffle answers and set the question
                const allAnswers = [correctTranslation, ...incorrectAnswers];
                allAnswers.sort(() => Math.random() - 0.5); // Shuffle the answers

                setCurrentQuestion({
                    word: questionWord.word,
                    wordLanguage: questionWord.primaryLanguage,
                    correctTranslation: correctTranslation,
                    targetLanguage: questionWord.translations[0].language, // Assume the first translation's language is the target language
                    answers: allAnswers
                });

                setFeedback(''); // Clear feedback when generating a new question
                setSelectedAnswer(null); // Reset selected answer state
                setAnswerSubmitted(false); // Reset answerSubmitted state
            } else {
                setFeedback('Selected word has no translations.');
            }
        } else {
            setFeedback('Not enough words available for quiz.');
        }
    }, []);

    const handleAnswerSelect = (answer) => {
        if (!answerSubmitted) {
            setSelectedAnswer(answer);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion) return;

        if (selectedAnswer === null) {
            setFeedback('Please select an answer.');
            return;
        }

        const correctAnswerLower = currentQuestion.correctTranslation.toLowerCase();
        const selectedAnswerLower = selectedAnswer.toLowerCase();

        if (selectedAnswerLower === correctAnswerLower) {
            setFeedback(`Correct! You have earned 1 point! The word "${currentQuestion.word}" (in ${getLanguageLabel(currentQuestion.wordLanguage)}) translates to "${currentQuestion.correctTranslation}" in ${getLanguageLabel(currentQuestion.targetLanguage)}.`);
            const newScore = score + 1;
            setScore(newScore); // Met à jour le score dans le contexte

            // Mise à jour du score dans la base de données
            const user = auth.currentUser;
            if (user) {
                const userRef = ref(database, `users/${user.uid}`);
                await update(userRef, { score: newScore });
            }

            setAnswerSubmitted(true);
        } else {
            setFeedback('Incorrect. Please try again.');
            setSelectedAnswer('');
        }
    };

    const handleNextQuestion = () => {
        setFeedback('');
        generateQuestion(words);
    };

    if (feedback && !currentQuestion) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-200 p-4">
                <div className="bg-white p-4 rounded shadow-md text-center">
                    <p className="text-lg text-red-500 font-extrabold">{feedback}</p>
                    <button
                        onClick={() => navigate('/add-word')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to Add Word
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
            <h1 className="text-3xl font-bold mb-4 text-center text-white">Quiz</h1>
            <div className="flex-1 flex flex-col items-center justify-center text-white">
                <h2 className="text-xl mb-4 text-center">
                    How do you say "{currentQuestion.word}" (which is in {getLanguageLabel(currentQuestion.wordLanguage)}) in {getLanguageLabel(currentQuestion.targetLanguage)}?
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4 w-full max-w-md">
                    {currentQuestion.answers.map((answer, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswerSelect(answer)}
                            className={`px-6 py-4 text-lg font-semibold rounded text-white ${selectedAnswer === answer ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'} ${answerSubmitted ? 'cursor-not-allowed' : ''}`}
                            disabled={answerSubmitted}
                        >
                            {answer}
                        </button>
                    ))}
                </div>
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={handleSubmitAnswer}
                        className={`px-4 py-2 rounded text-white ${answerSubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={answerSubmitted}
                    >
                        Submit Answer
                    </button>
                </div>
                {feedback && <div className="text-center text-red-500 font-extrabold mb-4">{feedback}</div>}
                {answerSubmitted && (
                    <div className="text-center">
                        <button
                            onClick={handleNextQuestion}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Next Question
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
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

export default Quiz;
