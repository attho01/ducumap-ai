import { useState } from 'react';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [started, setStarted] = useState(false);
  const [apiKey, setApiKey] = useState<string | undefined>();

  const handleStart = (key?: string) => {
    if (key) {
      setApiKey(key);
    }
    setStarted(true);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display break-keep">
      {!started ? (
        <LandingPage onStart={handleStart} />
      ) : (
        <ChatInterface onBack={() => setStarted(false)} apiKey={apiKey} />
      )}
    </div>
  );
}
