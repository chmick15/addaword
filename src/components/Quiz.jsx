import React, { useState, useEffect, useCallback } from 'react';
import { database, auth } from '../firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const Quiz = () => {
    const [words, setWords] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [options, setOptions] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [showNextButton, setShowNextButton] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
    const [answerShownByUser, setAnswerShownByUser] = useState(false);
    const [showAnswerClicked, setShowAnswerClicked] = useState(false); // New state for "Show Answer" clicked
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
                        if (wordsArray.length < 4) {
                            setWords([]);
                            setFeedback(
                                `You need at least 4 words to play the quiz. Please add more words in the AddWord section.`
                            );
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

                let options = [correctTranslation.translation];
                const usedTranslations = new Set([correctTranslation.translation]);

                while (options.length < 4) {
                    const randomIndex = Math.floor(Math.random() * wordsArray.length);
                    const randomWord = wordsArray[randomIndex];
                    if (randomWord.translations) {
                        const randomTranslation = randomWord.translations[Math.floor(Math.random() * randomWord.translations.length)];
                        if (randomTranslation && !usedTranslations.has(randomTranslation.translation)) {
                            options.push(randomTranslation.translation);
                            usedTranslations.add(randomTranslation.translation);
                        }
                    }
                }

                shuffleArray(options);

                setCurrentQuestion({
                    word: word.word,
                    wordLanguage: word.primaryLanguage,
                    correctTranslation: correctTranslation.translation,
                    targetLanguage: correctTranslation.language
                });

                setOptions(options);
                setFeedback('');
                setShowNextButton(false);
                setShowAnswer(false);
                setAttempted(false);
                setIsCorrectAnswer(false);
                setAnswerShownByUser(false);
                setShowAnswerClicked(false); // Reset showAnswerClicked
            } else {
                setFeedback('Selected word has no translations.');
            }
        } else {
            setFeedback('No words available for quiz.');
        }
    }, []);

    const handleOptionClick = (selectedOption) => {
        if (!currentQuestion) return;

        if (selectedOption === currentQuestion.correctTranslation) {
            setFeedback('');
            setShowAnswer(true);
            setIsCorrectAnswer(true);
            updateUserScore(1);
            setShowNextButton(true);
        } else {
            setFeedback('Incorrect. Try again.');
            setAttempted(true);
            setShowNextButton(false);
        }
    };

    const handleNextQuestion = () => {
        generateQuestion(words);
        setShowNextButton(false);
        setShowAnswer(false);
        setAttempted(false);
        setIsCorrectAnswer(false);
        setAnswerShownByUser(false);
        setShowAnswerClicked(false); // Reset showAnswerClicked
    };

    const handleShowAnswer = async () => {
        if (!currentQuestion) return;

        setShowAnswer(true);
        setAnswerShownByUser(true);
        setShowAnswerClicked(true); // Mark that Show Answer has been clicked
        setFeedback(`The word "${currentQuestion.word}" (in ${getLanguageLabel(currentQuestion.wordLanguage)}) translates to "${currentQuestion.correctTranslation}" in ${getLanguageLabel(currentQuestion.targetLanguage)}.`);
        setShowNextButton(true);
        await updateUserScore(-1);
    };

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
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

    if (feedback && !currentQuestion) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center p-4">
                    <p className="text-lg text-red-400">{feedback}</p>
                    {feedback.includes('4 words') && (
                        <button
                            onClick={() => navigate('/add-word')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Go to AddWord
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center p-4">
                    <div className="spinner"></div> {/* Add a spinner CSS class for loading effect */}
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <div className="p-4 max-w-lg bg-gray-900 text-white shadow-md rounded-lg">
                <h1 className="text-2xl font-bold mb-4">Quiz</h1>
                <div className="mb-40">
                    <h2 className="text-xl mb-2">
                        What is the translation of "{currentQuestion.word}" (which is in {getLanguageLabel(currentQuestion.wordLanguage)}) in {getLanguageLabel(currentQuestion.targetLanguage)}?
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleOptionClick(option)}
                                disabled={showAnswer}
                                className={`p-2 rounded-lg border ${showAnswer ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} `}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    {feedback && !showAnswer && <div className="mt-2 text-red-400">{feedback}</div>}
                    <div className="mt-4 flex justify-center">
                        {!showAnswer && (
                            <button
                                onClick={handleShowAnswer}
                                disabled={showAnswer}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Show Answer
                            </button>
                        )}
                        {showAnswer && (
                            <button
                                onClick={handleNextQuestion}
                                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Next Question
                            </button>
                        )}
                    </div>
                    {isCorrectAnswer && !answerShownByUser && (
                        <div className="mt-4 bg-green-700 p-4 rounded">
                            <p className="text-white"><strong>Well done! You answered correctly! You have won 1 point!</strong></p>
                        </div>
                    )}
                    {showAnswerClicked && !isCorrectAnswer && (
                        <div className="mt-4 p-4 bg-gray-700 rounded">
                            <p className="text-center">
                                The word "{currentQuestion.word}" (in {getLanguageLabel(currentQuestion.wordLanguage)}) translates to "{currentQuestion.correctTranslation}" in {getLanguageLabel(currentQuestion.targetLanguage)}.
                            </p>
                            <p className="text-center text-red-600 font-extrabold">
                                You have lost 1 point!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Quiz;
