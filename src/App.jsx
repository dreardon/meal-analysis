import { useState, useEffect } from 'react';
import './App.css';
import CameraCapture from './components/CameraCapture';
import AnalyzingView from './components/AnalyzingView';
import NutritionResult from './components/NutritionResult';
import UserProfile from './components/UserProfile';
import HistoryView from './components/HistoryView';
import { analyzeFoodImage } from './services/analysis';
import { loginWithGoogleCredential, auth, saveScan } from './services/firebase';
import { GoogleLogin, useGoogleOneTapLogin } from '@react-oauth/google';

function App() {
  const [view, setView] = useState('capture'); // capture, analyzing, result
  const [imagePreview, setImagePreview] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIdToken(credentialResponse.credential);
    try {
      await loginWithGoogleCredential(credentialResponse.credential);
    } catch (e) {
      console.error("Firebase Auth failed:", e);
    }
  };

  useGoogleOneTapLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      console.log('One tap login Failed');
    },
  });

  const handleCapture = async (file, previewUrl) => {
    setImagePreview(previewUrl);
    setView('analyzing');
    setAnalysisProgress(null);

    try {
      const data = await analyzeFoodImage(file, idToken, (progress) => {
        setAnalysisProgress(progress);
      });
      setResultData(data);
      setView('result');

      // Save to Firebase asynchronously
      if (firebaseUser) {
        try {
          // ensure we pass a base64 string
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            const base64String = reader.result.split(',')[1];
            await saveScan(firebaseUser.uid, base64String, data);
          };
        } catch (e) {
          console.error("Failed saving scan history:", e);
        }
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed: " + error.message);
      setView('capture');
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setResultData(null);
    setView('capture');
  };

  const handleSignOut = () => {
    auth.signOut();
    setIdToken(null);
    setView('capture');
  };

  return (
    <div className="app-container fade-in">
      <UserProfile
        user={firebaseUser}
        onSignOut={handleSignOut}
        onViewHistory={() => setView('history')}
      />
      <header className="responsive-header">
        <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Meal Analysis</h1>
      </header>

      <div className="content-wrapper">
        {view === 'capture' && !firebaseUser && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Please sign in to start analyzing your meals.</p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Login Failed')}
              theme="filled_black"
              shape="pill"
            />
          </div>
        )}
        {view === 'capture' && firebaseUser && <CameraCapture onCapture={handleCapture} />}
        {view === 'analyzing' && <AnalyzingView imagePreview={imagePreview} analysisProgress={analysisProgress} />}
        {view === 'result' && <NutritionResult data={resultData} imagePreview={imagePreview} onReset={handleReset} />}
        {view === 'history' && (
          <HistoryView
            user={firebaseUser}
            onBack={() => setView('capture')}
            onSelectScan={(data, imageUrl) => {
              setResultData(data);
              setImagePreview(imageUrl);
              setView('result');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
