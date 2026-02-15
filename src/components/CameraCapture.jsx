import { Camera, Upload } from 'lucide-react';
import { useRef } from 'react';

export default function CameraCapture({ onCapture }) {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create a local URL for preview
            const imageUrl = URL.createObjectURL(file);
            onCapture(file, imageUrl);
        }
    };

    const triggerInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="fade-in centered-view">
            <div style={{ textAlign: 'center' }}>
                <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Scan Your Meal</h2>
                <p style={{ color: 'var(--text-muted)' }}>Get instant nutrition insights.</p>
            </div>

            <div
                className="glass-panel camera-trigger"
                onClick={triggerInput}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Camera size={64} color="var(--color-primary)" />
            </div>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Tap the circle to open camera
            </p>
        </div>
    );
}
