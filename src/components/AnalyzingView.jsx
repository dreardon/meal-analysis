import { CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

const STAGES = [
    { id: 'identification_agent', label: 'Identification Agent', defaultSub: 'Spotting ingredients...' },
    { id: 'research_agent', label: 'Research Agent', defaultSub: 'Searching nutrition facts...' },
    { id: 'calculator_agent', label: 'Dietitian Agent', defaultSub: 'Synthesizing meal plan...' }
];

export default function AnalyzingView({ imagePreview, analysisProgress }) {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [agentMessages, setAgentMessages] = useState({});
    const [completedStages, setCompletedStages] = useState(new Set());

    useEffect(() => {
        if (analysisProgress && analysisProgress.author) {
            const index = STAGES.findIndex(s => s.id === analysisProgress.author);
            if (index !== -1) {
                setCurrentStageIndex(prev => Math.max(prev, index));

                if (analysisProgress.text) {
                    setAgentMessages(prev => ({
                        ...prev,
                        [analysisProgress.author]: analysisProgress.text
                    }));
                }

                if (analysisProgress.isDone) {
                    setCompletedStages(prev => {
                        const next = new Set(prev);
                        next.add(index);
                        return next;
                    });
                    if (index < STAGES.length - 1) {
                        setCurrentStageIndex(index + 1);
                    }
                }
            }
        }
    }, [analysisProgress]);

    // Helper to attempt to extract and format JSON lists
    const formatAgentMessage = (rawMsg, defaultSub) => {
        if (!rawMsg) return { displaySub: defaultSub, hasData: false };

        let cleanMsg = rawMsg.replace(/```json/g, '').replace(/```/g, '').trim();
        let displaySub = cleanMsg;

        if (cleanMsg.includes('{') || cleanMsg.includes('[')) {
            try {
                const possibleJsonIndex = cleanMsg.indexOf('{');
                if (possibleJsonIndex !== -1) {
                    const possibleJson = cleanMsg.substring(possibleJsonIndex);
                    const parsed = JSON.parse(possibleJson);
                    if (parsed.items && Array.isArray(parsed.items)) {
                        displaySub = parsed.items.map(i => i.name || i).join(', ');
                    } else if (parsed.foodName) {
                        displaySub = parsed.foodName;
                    }
                }
            } catch (e) {
                // streaming partial json, format safely fallback
            }
        }

        if (displaySub.length > 150) {
            displaySub = displaySub.substring(0, 150) + '...';
        }

        return { displaySub, hasData: true };
    };


    return (
        <div className="fade-in analyzing-view" style={{ padding: '2rem 1rem' }}>
            <h2 className="text-gradient" style={{ marginBottom: '2.5rem', fontSize: '1.8rem' }}>AI Agent Analysis</h2>

            <div className="split-layout analysis-content" style={{ maxWidth: '1000px' }}>
                <div className="analysis-image-wrapper">
                    {/* Background Image Preview */}
                    {imagePreview ? (
                        <img
                            src={imagePreview}
                            alt="Analyzing"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) blur(2px)' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)' }} />
                    )}

                    {/* Scanning Overlay (Keeping the cool sliding animation) */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.3), transparent)',
                        animation: 'scan 2.5s ease-in-out infinite',
                        borderBottom: '3px solid var(--color-primary)',
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
                    }}></div>
                </div>

                {/* Agent Progress Stages */}
                <div className="agent-list-wrapper">
                    {STAGES.map((stage, index) => {
                        const isActive = index === currentStageIndex && !completedStages.has(index);
                        const isCompleted = completedStages.has(index) || index < currentStageIndex;

                        const rawMsg = agentMessages[stage.id];
                        const { displaySub, hasData } = formatAgentMessage(rawMsg, stage.defaultSub);

                        return (
                            <div
                                key={stage.id}
                                className="glass-panel"
                                style={{
                                    padding: '1.25rem', /* Increased padding */
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.25rem',
                                    opacity: isActive || isCompleted ? 1 : 0.4,
                                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.4s ease',
                                    borderLeft: isActive ? '4px solid var(--color-primary)' : isCompleted ? '4px solid #10b981' : '4px solid transparent',
                                    minHeight: '80px' /* Ensure consistent height */
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px' }}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={24} color="#10b981" />
                                    ) : isActive ? (
                                            <Loader2 size={24} className="spin" color="var(--color-primary)" />
                                        ) : (
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: '700',
                                        fontSize: '1rem', /* Larger font */
                                        color: isActive ? 'var(--text-main)' : isCompleted ? 'var(--text-muted)' : 'var(--text-muted)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {stage.label}
                                    </div>
                                    {(isActive || isCompleted) && (
                                        <div style={{
                                            fontSize: '0.85rem', /* Larger font */
                                            color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}>
                                            {hasData && <MessageSquare size={14} />}
                                            <span style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: isActive ? 4 : 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: 1.5,
                                                wordBreak: 'break-word'
                                            }}>
                                                {displaySub}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    50% { transform: translateY(100%); }
                    100% { transform: translateY(-100%); }
                }
                .spin {
                    animation: spin 2s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
