import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { FlagIcon } from 'react-flag-kit';
import { database, auth } from '../firebase';
import { ref, onValue, remove, update, push, set } from 'firebase/database';
import Modal from 'react-modal';
import capitalize from 'lodash/capitalize';

// Options de langue
const languageOptions = [
    { value: '', label: 'All Languages', flag: 'EU' }, // Option pour toutes les langues
    { value: 'en', label: 'English', flag: 'GB' },
    { value: 'es', label: 'Español', flag: 'ES' },
    { value: 'fr', label: 'Français', flag: 'FR' },
    { value: 'it', label: 'Italiano', flag: 'IT' }
];

const filteredLanguageOptions = languageOptions.filter(opt => opt.value !== '');
console.log(filteredLanguageOptions);

const getLanguageLabel = (value) => {
    const option = languageOptions.find(opt => opt.value === value);
    return option ? option.label : value;
};

const getLanguageFlag = (value) => {
    const option = languageOptions.find(opt => opt.value === value);
    return option ? option.flag : '';
};

// Fonction pour formater les options avec des drapeaux
const formatOptionLabel = ({ label, flag }) => (
    <div className="flex items-center">
        <FlagIcon code={flag} size={20} className="mr-2" />
        {label}
    </div>
);

const WordList = () => {
    const [words, setWords] = useState([]);
    const [editingWord, setEditingWord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredWords, setFilteredWords] = useState([]);
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
    const [selectedLanguage, setSelectedLanguage] = useState(''); // Filtre de langue
    const [formErrors, setFormErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [editMessage, setEditMessage] = useState(''); // Message d'édition
    const [messageTimeout, setMessageTimeout] = useState(null); // Gérer les délais des messages
    const [modalErrorMessage, setModalErrorMessage] = useState(''); // Message d'erreur dans la modale
    const [wordCount, setWordCount] = useState(0);

    const user = auth.currentUser;

    useEffect(() => {
        if (user) {
            const wordsRef = ref(database, `user_words/${user.uid}`);
            const unsubscribe = onValue(wordsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setWords(Object.entries(data).map(([key, value]) => ({ ...value, id: key })));
                } else {
                    setWords([]);
                }
            }, (error) => {
                console.error('Error fetching words:', error);
            });

            return () => unsubscribe();
        }
    }, [user]);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const filtered = words.filter(word => {
            if (!word.translations || !Array.isArray(word.translations)) {
                return false;
            }
            const wordMatches = word.word.toLowerCase().includes(lowercasedSearchTerm);
            const translationMatches = word.translations.some(t =>
                t.translation.toLowerCase().includes(lowercasedSearchTerm)
            );
            return (wordMatches || translationMatches) &&
                (selectedLanguage === '' || word.primaryLanguage === selectedLanguage);
        });

        filtered.sort((a, b) => {
            let comparison = a.word.localeCompare(b.word);
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        setFilteredWords(filtered);
        setWordCount(filtered.length); // Met à jour le compteur de mots
    }, [searchTerm, words, sortOrder, selectedLanguage]);

    const handleDeleteWord = async (id) => {
        try {
            if (user) {
                const wordRef = ref(database, `user_words/${user.uid}/${id}`);
                await remove(wordRef);
                showSuccessMessage('Word deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting word:', error);
        }
    };

    const handleEditWord = (word) => {
        setEditingWord(word);
        setEditMessage('Editing word...');
    };

    const handleModalClose = () => {
        setEditingWord(null);
        setFormErrors({});
        setSuccessMessage('');
        setEditMessage('');
        setModalErrorMessage(''); // Clear modal error message
        clearMessageTimeout();
    };

    const handleUpdateWord = async (e) => {
        e.preventDefault();

        const errors = {};

        if (!editingWord?.word?.trim()) errors.word = 'Word is required';
        if (!editingWord?.primaryLanguage) errors.primaryLanguage = 'Primary language is required';
        if (!Array.isArray(editingWord?.translations) || editingWord.translations.some(t => !t.language || !t.translation)) {
            errors.translations = 'Each translation must have a language and a translation';
        }

        const duplicateWord = words.some(
            (w) => w.word.toLowerCase() === editingWord.word.toLowerCase() &&
                w.primaryLanguage === editingWord.primaryLanguage &&
                w.id !== editingWord.id
        );
        if (duplicateWord) errors.duplicate = 'This word already exists in the selected language';

        const translationLanguages = new Set(editingWord.translations.map(t => t.language));
        if (translationLanguages.size !== editingWord.translations.length || translationLanguages.has(editingWord.primaryLanguage)) {
            errors.translations = 'Each translation must have a unique language and different from the primary language';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setModalErrorMessage(errors.translations || ''); // Set specific error message
            showModalError(); // Display error message in the modal
            return;
        }

        try {
            if (user) {
                const wordRef = ref(database, `user_words/${user.uid}/${editingWord.id}`);
                await update(wordRef, {
                    word: capitalize(editingWord.word),
                    primaryLanguage: editingWord.primaryLanguage,
                    translations: editingWord.translations || [] // Assurez-vous que 'translations' est un tableau
                });
                showSuccessMessage('Word updated successfully!');
                handleModalClose();
            }
        } catch (error) {
            console.error('Error updating word:', error);
        }
    };



    const handleAddWord = async (e) => {
        e.preventDefault();

        const errors = {};

        if (!editingWord?.word?.trim()) errors.word = 'Word is required';
        if (!editingWord?.primaryLanguage) errors.primaryLanguage = 'Primary language is required';
        if (!Array.isArray(editingWord?.translations) || editingWord.translations.some(t => !t.language || !t.translation)) {
            errors.translations = 'Each translation must have a language and a translation';
        }

        const duplicateWord = words.some(
            (w) => w.word.toLowerCase() === editingWord.word.toLowerCase() &&
                w.primaryLanguage === editingWord.primaryLanguage
        );
        if (duplicateWord) errors.duplicate = 'This word already exists in the selected language';

        const translationLanguages = new Set(editingWord.translations.map(t => t.language));
        if (translationLanguages.size !== editingWord.translations.length || translationLanguages.has(editingWord.primaryLanguage)) {
            errors.translations = 'Each translation must have a unique language and different from the primary language';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setModalErrorMessage(errors.translations || ''); // Set specific error message
            showModalError(); // Display error message in the modal
            return;
        }

        try {
            if (user) {
                const newWordRef = push(ref(database, `user_words/${user.uid}`));
                await set(newWordRef, {
                    word: capitalize(editingWord.word),
                    primaryLanguage: editingWord.primaryLanguage,
                    translations: editingWord.translations || [] // Assurez-vous que 'translations' est un tableau
                });
                showSuccessMessage('Word added successfully!');
                handleModalClose();
            }
        } catch (error) {
            console.error('Error adding word:', error);
        }
    };


    const handleTranslationChange = (index, field, value) => {
        const updatedTranslations = [...editingWord.translations];
        updatedTranslations[index] = { ...updatedTranslations[index], [field]: value };

        const translationLanguages = new Set(updatedTranslations.map(t => t.language));
        if (translationLanguages.size !== updatedTranslations.length || translationLanguages.has(editingWord.primaryLanguage)) {
            setFormErrors(prevErrors => ({ ...prevErrors, translations: 'Each translation must have a unique language and different from the primary language' }));
        } else {
            setFormErrors(prevErrors => {
                const { translations, ...rest } = prevErrors;
                return rest;
            });
        }

        setEditingWord({ ...editingWord, translations: updatedTranslations });
    };



    const addTranslationField = () => {
        if (editingWord.translations.length < 3) {
            const updatedTranslations = [...editingWord.translations, { language: '', translation: '' }];
            setEditingWord({ ...editingWord, translations: updatedTranslations });
        } else {
            setModalErrorMessage('You can only add up to 3 translations.');
            showModalError();
        }
    };

    const removeTranslationField = (index) => {
        const updatedTranslations = [...editingWord.translations];
        updatedTranslations.splice(index, 1);
        setEditingWord({ ...editingWord, translations: updatedTranslations });
    };

    const getFilteredLanguageOptions = (usedLanguages) => {
        return languageOptions.filter(opt => !usedLanguages.includes(opt.value));
    };

    const getFilteredLanguageOptionsForTranslations = (index) => {
        const usedLanguages = new Set(editingWord.translations.map((t, i) => i !== index ? t.language : null).filter(Boolean));
        return filteredLanguageOptions.filter(opt => !usedLanguages.has(opt.value));
    };


    const getUsedLanguages = () => {
        const usedLanguages = new Set([editingWord.primaryLanguage]);
        for (const t of editingWord.translations) {
            if (t.language) {
                usedLanguages.add(t.language);
            }
        }
        return Array.from(usedLanguages);
    };

    const validateTranslations = () => {
        const usedLanguages = getUsedLanguages();
        if (usedLanguages.length > filteredLanguageOptions.length) return false;

        const uniqueLanguages = new Set();
        for (const t of editingWord.translations) {
            if (uniqueLanguages.has(t.language)) return false;
            uniqueLanguages.add(t.language);
        }
        return true;
    };

    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        clearMessageTimeout();
        setMessageTimeout(setTimeout(() => setSuccessMessage(''), 3000)); // Masquer après 3 secondes
    };

    const showEditMessage = (message) => {
        setEditMessage(message);
        clearMessageTimeout();
        setMessageTimeout(setTimeout(() => setEditMessage(''), 3000)); // Masquer après 3 secondes
    };

    const showModalError = () => {
        setModalErrorMessage('Each translation must have a language and a translation');
        clearMessageTimeout();
        setMessageTimeout(setTimeout(() => setModalErrorMessage(''), 3000)); // Masquer après 3 secondes
    };

    const clearMessageTimeout = () => {
        if (messageTimeout) {
            clearTimeout(messageTimeout);
            setMessageTimeout(null);
        }
    };

    return (
        <div className="container mx-auto p-4 bg-gray-900">
            <input
                type="text"
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input w-full p-2 border rounded mb-4"
            />

            <Select
                options={languageOptions}
                onChange={(option) => setSelectedLanguage(option ? option.value : '')}
                value={languageOptions.find(opt => opt.value === selectedLanguage)}
                placeholder="Filter by language"
                formatOptionLabel={formatOptionLabel}
                className="language-filter mb-4"
            />

            <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-button py-2 px-4 bg-blue-500 text-white rounded mb-4"
            >
                Sort {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
            </button>

            <div className="word-count mb-4 text-white">
                <strong>Word Count:</strong> {wordCount}
            </div>

            <div className="word-card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWords.map((word) => (
                    <div key={word.id} className="word-card p-4 border rounded shadow-md bg-white">
                        <div className="word-card-header flex items-center mb-2">
                            <FlagIcon code={getLanguageFlag(word.primaryLanguage)} size={24} className="mr-2" />
                            <h3 className="text-xl font-semibold ">{word.word}</h3>
                        </div>
                        <div className="word-card-body mb-2">
                            <p><strong>Primary Language:</strong> {getLanguageLabel(word.primaryLanguage)}</p>
                            <p className="underline italic"><strong>Translations:</strong></p>
                            <ul className="list-disc pl-5">
                                {word.translations.map((t, index) => (
                                    <li key={index} className="flex items-center mb-1">
                                        <FlagIcon code={getLanguageFlag(t.language)} size={16} className="mr-2" />
                                        {t.translation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="word-card-footer flex justify-start mt-4 space-x-4">
                            <button onClick={() => handleEditWord(word)} className="card-button edit bg-yellow-500 text-white py-1 px-3 rounded">Edit</button>
                            <button onClick={() => handleDeleteWord(word.id)} className="card-button delete bg-red-500 text-white py-1 px-3 rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={!!editingWord}
                onRequestClose={handleModalClose}
                contentLabel="Edit Word"
                className="modal-content p-4 bg-white border border-gray-300 rounded shadow-lg"
                overlayClassName="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
                <form onSubmit={editingWord?.id ? handleUpdateWord : handleAddWord} className="modal-form">
                    <h2 className="text-2xl font-bold mb-4">{editingWord?.id ? 'Edit Word' : 'Add Word'}</h2>

                    <label className="block mb-2">
                        Word:
                        <input
                            type="text"
                            value={editingWord?.word || ''}
                            onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })}
                            className="w-full p-2 border rounded mt-1"
                        />
                    </label>

                    <label className="block mb-2">
                        Primary Language:
                        <Select
                            options={filteredLanguageOptions}
                            onChange={(option) => setEditingWord({ ...editingWord, primaryLanguage: option.value })}
                            value={filteredLanguageOptions.find(opt => opt.value === editingWord?.primaryLanguage)}
                            formatOptionLabel={formatOptionLabel}
                            className="mt-1"
                        />
                    </label>

                    <label className="block mb-4">
                        Translations:
                        <div>
                            {editingWord?.translations.slice(0, 3).map((t, index) => (
                                <div key={index} className="translation-item mb-4">
                                    <label className="block mb-2">
                                        <Select
                                            value={filteredLanguageOptions.find(opt => opt.value === t.language)}
                                            onChange={(option) => handleTranslationChange(index, 'language', option.value)}
                                            options={getFilteredLanguageOptionsForTranslations(index)}
                                            formatOptionLabel={formatOptionLabel}
                                            className="w-full"
                                        />
                                    </label>
                                    <label className="block mb-2">
                                        <input
                                            type="text"
                                            placeholder="Translation"
                                            value={t.translation}
                                            onChange={(e) => handleTranslationChange(index, 'translation', e.target.value)}
                                            className="p-2 border rounded w-full"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeTranslationField(index)}
                                        className="bg-red-500 text-white py-1 px-2 rounded"
                                    >
                                        Remove the translation
                                    </button>
                                </div>
                            ))}

                            {editingWord?.translations.length < 3 && (
                                <button type="button" onClick={addTranslationField} className="bg-blue-500 text-white py-1 px-3 rounded">
                                    Add Translation
                                </button>
                            )}
                        </div>
                    </label>



                    {formErrors.word && <div className="error text-red-500 mb-2">{formErrors.word}</div>}
                    {formErrors.primaryLanguage && <div className="error text-red-500 mb-2">{formErrors.primaryLanguage}</div>}
                    {formErrors.duplicate && <div className="error text-red-500 mb-2">{formErrors.duplicate}</div>}
                    {modalErrorMessage && <div className="modal-error text-red-500 mb-2">{modalErrorMessage}</div>}
                    <div className="modal-buttons flex justify-between mt-4">
                        <button type="submit" className="save-button bg-green-500 text-white py-2 px-4 rounded">Save</button>
                        <button type="button" className="cancel-button bg-gray-500 text-white py-2 px-4 rounded" onClick={handleModalClose}>Cancel</button>
                    </div>
                </form>
            </Modal>

            {successMessage && <div className="success-message text-green-500">{successMessage}</div>}
            {editMessage && <div className="edit-message text-yellow-500">{editMessage}</div>}
        </div>
    );
};

export default WordList;


