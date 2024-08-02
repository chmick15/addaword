import React from 'react';
import './index.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import AddWord from './components/AddWord';
import Auth from './components/Auth';
import WordList from './components/WordList';
import Quiz from './components/Quiz';
import NavBar from './components/NavBar';
import HardQuiz from './components/HardQuiz';
import { ScoreProvider } from './components/ScoreContext'; // Import ScoreProvider
import Modal from 'react-modal';

// Configure the root element for accessibility
Modal.setAppElement('#root'); // This line is crucial for accessibility

const App = () => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ScoreProvider>
      <Router>
        {user && <NavBar />}
        <Routes>
          <Route path="/" element={user ? <Navigate to="/word-list" /> : <Navigate to="/auth" />} />
          <Route path="/auth" element={user ? <Navigate to="/word-list" /> : <Auth />} />
          <Route path="/add-word" element={user ? <AddWord /> : <Navigate to="/auth" />} />
          <Route path="/word-list" element={user ? <WordList /> : <Navigate to="/auth" />} />
          <Route path="/quiz" element={user ? <Quiz /> : <Navigate to="/auth" />} />
          <Route path="/hard-quiz" element={user ? <HardQuiz /> : <Navigate to="/auth" />} />
        </Routes>
      </Router>
    </ScoreProvider>
  );
};

export default App;
