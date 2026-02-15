import { useState } from 'react';
import './App.css';
import CameraCapture from './components/CameraCapture';
import AnalyzingView from './components/AnalyzingView';
import NutritionResult from './components/NutritionResult';
import { analyzeFoodImage } from './services/analysis';

function App() {
  const [view, setView] = useState('capture'); // capture, analyzing, result
  const [imagePreview, setImagePreview] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(null);

  const handleCapture = async (file, previewUrl) => {
    setImagePreview(previewUrl);
    setView('analyzing');
    setAnalysisProgress(null);

    try {
      const data = await analyzeFoodImage(file, (progress) => {
        setAnalysisProgress(progress);
      });
      setResultData(data);
      setView('result');
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

  return (
    <div className="fade-in" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Meal Analysis</h1>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'capture' && <CameraCapture onCapture={handleCapture} />}
        {view === 'analyzing' && <AnalyzingView imagePreview={imagePreview} analysisProgress={analysisProgress} />}
        {view === 'result' && <NutritionResult data={resultData} imagePreview={imagePreview} onReset={handleReset} />}
      </div>
    </div>
  );
}

export default App;
