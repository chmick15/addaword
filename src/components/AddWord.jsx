import React, { useState } from 'react';
import Select from 'react-select';
import { FlagIcon } from 'react-flag-kit';
import { database, auth } from '../firebase';
import { ref, push, update, get } from 'firebase/database';

const languageOptions = [
    { value: 'en', label: 'English', flag: 'GB' },
    { value: 'es', label: 'Español', flag: 'ES' },
    { value: 'fr', label: 'Français', flag: 'FR' },
    { value: 'it', label: 'Italiano', flag: 'IT' }
];

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const AddWord = () => {
    const [word, setWord] = useState('');
    const [primaryLanguage, setPrimaryLanguage] = useState(null);
    const [translations, setTranslations] = useState([{ language: null, translation: '' }]);
    const [formErrors, setFormErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    const user = auth.currentUser;

    // Get the used languages including the primary language
    const getUsedLanguages = () => {
        const usedLanguages = new Set(translations.map(t => t.language?.value).filter(Boolean));
        if (primaryLanguage) usedLanguages.add(primaryLanguage.value);
        return usedLanguages;
    };

    // Get filtered language options for select inputs
    const getFilteredLanguageOptions = () => {
        const usedLanguages = getUsedLanguages();
        return languageOptions.filter(option => !usedLanguages.has(option.value));
    };

    // Handle translation change
    const handleTranslationChange = (index, field, value) => {
        const newTranslations = [...translations];
        newTranslations[index] = { ...newTranslations[index], [field]: value };
        setTranslations(newTranslations);
    };

    // Add a new translation field
    const addTranslationField = () => {
        setTranslations([...translations, { language: null, translation: '' }]);
    };

    // Remove a translation field
    const removeTranslationField = (index) => {
        const updatedTranslations = translations.filter((_, i) => i !== index);
        setTranslations(updatedTranslations);
    };

    // Validate the form fields
    const validateForm = async () => {
        const errors = {};

        if (!word.trim()) errors.word = 'Word is required';
        if (!primaryLanguage) errors.primaryLanguage = 'Primary language is required';

        translations.forEach((t, index) => {
            if (!t.language || !t.translation.trim()) {
                errors.translations = 'Each translation must have a language and a translation';
            }
        });

        const duplicateWord = await checkForDuplicateWord();
        if (duplicateWord) errors.duplicate = 'This word already exists in the selected language';

        if (!validateTranslations()) errors.translations = 'Each translation must have a unique language and the number of translations must not exceed the available languages';

        return errors;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = await validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setTimeout(() => setFormErrors({}), 3000);
            return;
        }

        try {
            if (user) {
                const newWordRef = push(ref(database, `user_words/${user.uid}`));
                await update(newWordRef, {
                    word: capitalize(word),
                    primaryLanguage: primaryLanguage.value,
                    translations: translations.map(t => ({
                        language: t.language?.value || '',
                        translation: capitalize(t.translation)
                    }))
                });

                setSuccessMessage('Word added successfully!');
                resetForm();
                setTimeout(() => setSuccessMessage(''), 2000);
            }
        } catch (error) {
            console.error('Error adding word:', error);
        }
    };

    // Check if the word already exists
    const checkForDuplicateWord = async () => {
        if (!user) return false;

        const wordsRef = ref(database, `user_words/${user.uid}`);
        try {
            const snapshot = await get(wordsRef);
            const words = snapshot.val();
            if (!words) return false;

            return Object.values(words).some(w =>
                w.word.toLowerCase() === word.toLowerCase() && w.primaryLanguage === primaryLanguage.value
            );
        } catch (error) {
            console.error('Error checking for duplicate word:', error);
            return false;
        }
    };

    // Validate translations
    const validateTranslations = () => {
        const usedLanguages = new Set([primaryLanguage?.value].filter(Boolean));
        for (const translation of translations) {
            if (translation.language && usedLanguages.has(translation.language.value)) {
                return false;
            }
            usedLanguages.add(translation.language?.value);
        }

        const maxTranslationsAllowed = languageOptions.length - 1;
        return translations.length <= maxTranslationsAllowed;
    };

    // Reset the form fields
    const resetForm = () => {
        setWord('');
        setPrimaryLanguage(null);
        setTranslations([{ language: null, translation: '' }]);
    };

    // Format the option label for Select component
    const formatOptionLabel = ({ label, flag }) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <FlagIcon code={flag} size={20} style={{ marginRight: 10 }} />
            <span style={{ color: 'black' }}>{label}</span>
        </div>
    );

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col p-6">
            <h2 className="text-3xl font-bold mb-6 text-cyan-400">Add a New Word</h2>
            <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
                <div>
                    <label className="block text-lg mb-2">
                        Word:
                        <input
                            type="text"
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            className="mt-1 p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-cyan-500 focus:outline-none w-full"
                        />
                    </label>
                    {formErrors.word && <p className="text-red-500">{formErrors.word}</p>}
                </div>
                <div>
                    <label className="block text-lg mb-2">
                        Primary Language:
                        <Select
                            value={primaryLanguage}
                            onChange={(option) => setPrimaryLanguage(option)}
                            options={getFilteredLanguageOptions()}
                            placeholder="Select language"
                            formatOptionLabel={formatOptionLabel}
                            className="mt-1"
                            classNamePrefix="select"
                        />
                    </label>
                    {formErrors.primaryLanguage && <p className="text-red-500">{formErrors.primaryLanguage}</p>}
                </div>
                <div>
                    <label className="block text-lg mb-2">Translations:</label>
                    {translations.map((translation, index) => (
                        <div key={index} className="flex flex-col mb-4">
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
                                <div className="w-full md:w-1/2 mb-2 md:mb-0">
                                    <Select
                                        value={translation.language}
                                        onChange={(option) => handleTranslationChange(index, 'language', option)}
                                        options={getFilteredLanguageOptions()}
                                        placeholder="Select language"
                                        formatOptionLabel={formatOptionLabel}
                                        className="w-full"
                                        classNamePrefix="select"
                                    />
                                </div>
                                <div className="w-full md:w-1/2 flex md:justify-center">
                                    {translations.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTranslationField(index)}
                                            className="hidden md:block bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg mt-2"
                                        >
                                            Remove the translation
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                type="text"
                                value={translation.translation}
                                onChange={(e) => handleTranslationChange(index, 'translation', e.target.value)}
                                placeholder="Translation"
                                className="p-3 rounded-md bg-gray-800 border border-gray-700 focus:border-cyan-500 focus:outline-none"
                            />
                            {translations.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeTranslationField(index)}
                                    className="md:hidden bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg mt-2"
                                >
                                    Remove the translation
                                </button>
                            )}
                        </div>
                    ))}
                    {translations.length < languageOptions.length - 1 && (
                        <button
                            type="button"
                            onClick={addTranslationField}
                            className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            Add Another Translation
                        </button>
                    )}
                    {formErrors.translations && <p className="text-red-500">{formErrors.translations}</p>}
                </div>
                {formErrors.duplicate && <p className="text-red-500">{formErrors.duplicate}</p>}
                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg w-full md:w-1/6 mx-auto"
                >
                    Save Word to List
                </button>
                {successMessage && <p className="text-green-500 mt-2">{successMessage}</p>}
            </form>
        </div>
    );
};

export default AddWord;
