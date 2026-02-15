import { ChevronLeft, Flame, Wheat, Drumstick, Droplets, Info } from 'lucide-react';

export default function NutritionResult({ data, imagePreview, onReset }) {
    if (!data) return null;

    return (
        <div className="fade-in" style={{ flex: 1, paddingBottom: '3rem' }}>
            <button
                onClick={onReset}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'var(--glass-border)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'background 0.2s'
                }}
            >
                <ChevronLeft size={18} style={{ marginRight: '0.4rem' }} /> Back to Scan
            </button>

            {/* Hero Image Section */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: 'var(--glass-border)' }}>
                <img
                    src={imagePreview}
                    alt="Analyzed Meal"
                    style={{ width: '100%', height: '240px', objectFit: 'cover' }}
                />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '2rem 1.5rem 1.5rem',
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>{data.foodName}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.confidence > 80 ? '#10b981' : '#f59e0b' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>{data.confidence}% Confidence</span>
                    </div>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="result-grid">
                <NutritionCard
                    icon={<Flame size={20} color="#f59e0b" />}
                    label="Calories"
                    value={data.calories}
                    unit="kcal"
                    color="rgba(245, 158, 11, 0.15)"
                />
                <NutritionCard
                    icon={<Drumstick size={20} color="#ef4444" />}
                    label="Protein"
                    value={data.protein}
                    unit="g"
                    color="rgba(239, 68, 68, 0.15)"
                />
                <NutritionCard
                    icon={<Wheat size={20} color="#3b82f6" />}
                    label="Carbs"
                    value={data.carbs}
                    unit="g"
                    color="rgba(59, 130, 246, 0.15)"
                />
                <NutritionCard
                    icon={<Droplets size={20} color="#10b981" />}
                    label="Fat"
                    value={data.fat}
                    unit="g"
                    color="rgba(16, 185, 129, 0.15)"
                />
            </div>

            <div className="split-layout" style={{ alignItems: 'start' }}>
                {/* Individual Componets Breakdown */}
                <div style={{ width: '100%' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Info size={18} color="var(--color-primary)" />
                        Plate Breakdown
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                        {data.items && data.items.map((item, index) => (
                            <div key={index} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid var(--color-primary)` }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.2rem' }}>{item.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.portion}</div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'flex-end', maxWidth: '180px' }}>
                                    {item.calories !== undefined && <Tag label=" cals" value={item.calories} />}
                                    {item.protein !== undefined && <Tag label=" protein" value={item.protein} color="#ef4444" />}
                                    {item.carbs !== undefined && <Tag label=" carbs" value={item.carbs} color="#3b82f6" />}
                                    {item.fat !== undefined && <Tag label=" fats" value={item.fat} color="#10b981" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Insights Section */}
                <div style={{ width: '100%' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))' }}>
                        <h4 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '0.8rem' }}>Dietitian's Insights</h4>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.7', margin: 0, opacity: 0.9 }}>
                            {data.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Tag({ label, value, color }) {
    return (
        <span style={{
            fontSize: '0.7rem',
            background: color ? `${color}20` : 'rgba(255,255,255,0.1)',
            color: color || 'var(--text-muted)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 'bold',
            border: `1px solid ${color ? `${color}40` : 'rgba(255,255,255,0.1)'}`
        }}>
            {value}{label}
        </span>
    );
}

function NutritionCard({ icon, label, value, unit, color }) {
    return (
        <div className="glass-panel" style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            backgroundColor: color || 'var(--bg-card)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.2 }}>
                {icon}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '800' }}>{value}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>{unit}</span>
            </div>
        </div>
    );
}

