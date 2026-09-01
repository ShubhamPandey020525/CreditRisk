import { useState } from 'react';
import {
  ArrowRight, ShieldCheck, AlertTriangle, AlertCircle, X,
  ShieldAlert, Zap, TrendingUp, Target, Activity, Lock
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
type RiskLevel = 'Low' | 'Moderate' | 'High';

interface PredResult {
  customer_id?: string;
  ai_decision?: string;
  score: number;
  level: RiskLevel;
  message: string;
  default_probability?: string;
  top_reasons?: string[];
  shap_explanation?: {
    base_value: number;
    features: Array<{ feature: string; value: number; shap_value: number; impact: string; reason?: string }>;
  };
}

/* ─────────────────────────────────────────────────────────
   Helper: parse reason string into parts
───────────────────────────────────────────────────────── */
function parseReason(r: string) {
  const isRisk = r.startsWith('🔴');
  const colonIdx = r.indexOf(':');
  const dashIdx  = r.indexOf('—');
  const badge    = colonIdx > 0 ? r.slice(0, colonIdx).trim() : r;
  const feature  = (colonIdx > 0 && dashIdx > colonIdx) ? r.slice(colonIdx + 1, dashIdx).trim() : badge;
  const detail   = dashIdx > 0 ? r.slice(dashIdx + 1).trim() : '';
  const pctMatch = badge.match(/\d+%/);
  const pct      = pctMatch ? pctMatch[0] : '';
  return { isRisk, feature, detail, pct };
}

/* ─────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────── */
const Landing = () => {
  const [showFormModal, setShowFormModal]     = useState(false);
  const [isPredicting, setIsPredicting]       = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [predResult, setPredResult]           = useState<PredResult | null>(null);

  /* ── Submit handler ─────────────────────────────────── */
  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPredicting) return;

    const fd          = new FormData(e.target as HTMLFormElement);
    const age         = Number(fd.get('person_age'));
    const credHist    = Number(fd.get('cb_person_cred_hist_length'));
    const empLength   = Number(fd.get('person_emp_length'));
    const personIncome= Number(fd.get('person_income'));
    const loanAmnt    = Number(fd.get('loan_amnt'));

    if (credHist > (age - 18)) {
      alert("Credit history length cannot exceed the applicant's adult life (Age - 18).");
      return;
    }
    if (empLength > (age - 14)) {
      alert("Employment length seems unrealistic for the applicant's age.");
      return;
    }

    const body = {
      applicant_name:           fd.get('applicant_name'),
      person_age:               age,
      person_income:            personIncome,
      person_home_ownership:    fd.get('person_home_ownership'),
      person_emp_length:        empLength,
      loan_intent:              fd.get('loan_intent'),
      loan_grade:               fd.get('loan_grade'),
      loan_amnt:                loanAmnt,
      loan_int_rate:            Number(fd.get('loan_int_rate')),
      loan_percent_income:      personIncome > 0 ? loanAmnt / personIncome : 0,
      cb_person_default_on_file:fd.get('cb_person_default_on_file'),
      cb_person_cred_hist_length:credHist,
    };

    setShowFormModal(false);
    setShowResultModal(true);
    setIsPredicting(true);
    setPredResult(null);

    try {
      const res  = await fetch('http://localhost:8000/api/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setPredResult({
        customer_id:       data.customer_id,
        ai_decision:       data.ai_decision,
        score:             data.risk_score,
        level:             data.risk_level as RiskLevel,
        message:           data.message,
        default_probability: data.default_probability,
        top_reasons:       data.top_reasons,
        shap_explanation:  data.shap_explanation,
      });
    } catch (err) {
      setPredResult({
        score: 0, level: 'High',
        message: `Connection error: ${err instanceof Error ? err.message : 'Unknown'}. Is the backend running?`,
      });
    } finally {
      setIsPredicting(false);
    }
  };

  const isApprove = predResult?.ai_decision === 'APPROVE_LOAN';
  const heroGrad  = isApprove
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.2rem 3rem', flexShrink: 0,
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            padding: '0.45rem', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
          }}>
            <ShieldAlert size={18} color="white" />
          </div>
          <span className="outfit" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            CreditRisk<span style={{ color: '#6366f1' }}>.</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.35rem 0.85rem', borderRadius: '20px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>AI Engine Online</span>
          </div>
          <button
            onClick={() => setShowFormModal(true)}
            className="glass-button primary"
            style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <Zap size={14} /> Analyse Loan
          </button>
        </div>
      </nav>

      {/* ══ HERO — fills remaining space ══════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Main row: left hero + right cards */}
        <div style={{ flex: 1, display: 'flex', padding: '2.5rem 3.5rem', gap: '3rem', overflow: 'hidden' }}>

          {/* ── LEFT ─────────────────────────────────────────── */}
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2rem', minWidth: 0 }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              padding: '0.45rem 1.1rem', borderRadius: '20px',
            }}>
              <Target size={14} color="#6366f1" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1' }}>XGBoost · 94% Accuracy · SHAP Explainability</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="outfit" style={{
                fontSize: 'clamp(4rem, 7vw, 7.5rem)', fontWeight: 900, lineHeight: 0.95,
                letterSpacing: '-0.04em', color: '#0f172a',
              }}>
                Credit<span style={{
                  background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Risk</span>
              </h1>
              <h2 style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.55rem)', fontWeight: 500, color: '#475569', marginTop: '1rem', lineHeight: 1.45 }}>
                AI-powered loan default prediction with<br />
                <span style={{ color: '#6366f1', fontWeight: 700 }}>real-time SHAP explanations</span> — know exactly why.
              </h2>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '3rem' }}>
              {[
                { val: '94%',  label: 'Model Accuracy', sublabel: 'XGBoost AUC',        color: '#6366f1' },
                { val: '< 1s', label: 'Response Time',  sublabel: 'Real-time inference', color: '#ec4899' },
                { val: '32k+', label: 'Loans Analysed', sublabel: 'Training dataset',    color: '#06b6d4' },
              ].map(s => (
                <div key={s.label}>
                  <div className="outfit" style={{ fontSize: 'clamp(2rem,3.5vw,3.2rem)', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, marginTop: '0.25rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>{s.sublabel}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowFormModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
                  background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                  color: 'white', border: 'none', padding: '1rem 2.5rem',
                  borderRadius: '50px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 15px 40px -5px rgba(99,102,241,0.45)',
                  transition: 'all 0.25s ease', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px -5px rgba(99,102,241,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 15px 40px -5px rgba(99,102,241,0.45)'; }}
              >
                Run AI Analysis <ArrowRight size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>No credit check · Instant results</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: 3 cards ───────────────────────────────── */}
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

            {/* Top 2 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', flex: 1 }}>
              {/* Card 1 */}
              <div style={{
                background: 'white', border: '1px solid rgba(226,232,240,0.8)',
                borderRadius: '24px', padding: '2rem',
                animation: 'float 4s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(99,102,241,0.07)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ShieldCheck size={22} color="#10b981" />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '0.25rem 0.7rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(16,185,129,0.15)' }}>Global</span>
                </div>
                <div>
                  <div className="outfit" style={{ fontSize: 'clamp(2.4rem,3.5vw,3.5rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: '0.2rem' }}>11%</div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>Debt Struggle Rate</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.6rem', lineHeight: 1.55 }}>
                    Over 11% of individuals globally struggle to clear personal debt obligations.
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div style={{
                background: 'white', border: '1px solid rgba(226,232,240,0.8)',
                borderRadius: '24px', padding: '2rem',
                animation: 'float 4.5s ease-in-out infinite reverse',
                boxShadow: '0 8px 32px rgba(236,72,153,0.07)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrendingUp size={22} color="#ec4899" />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ec4899', background: 'rgba(236,72,153,0.08)', padding: '0.25rem 0.7rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(236,72,153,0.15)' }}>Avg</span>
                </div>
                <div>
                  <div className="outfit" style={{ fontSize: 'clamp(2.4rem,3.5vw,3.5rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: '0.2rem' }}>6–8%</div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>Bank Default Rate</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.6rem', lineHeight: 1.55 }}>
                    Institutions lose billions annually from undetected high-risk borrowers.
                  </div>
                </div>
              </div>
            </div>

            {/* Wide bottom card */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f4ff 0%, #fff 60%, #fdf4ff 100%)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: '24px', padding: '1.75rem 2rem',
              animation: 'float 5s ease-in-out infinite',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(99,102,241,0.09)',
              flex: '0 0 auto',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 220, height: 220, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Activity size={26} color="#6366f1" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.4rem' }}>
                    <div className="outfit" style={{ fontSize: 'clamp(2rem,3vw,3rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>$1.4T</div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '0.25rem 0.7rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(99,102,241,0.15)' }}>Global Risk</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700, marginBottom: '0.3rem' }}>Annual Credit Exposure</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    AI-driven credit scoring reduces default losses by up to 40% compared to manual underwriting.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM FEATURE STRIP ───────────────────────────── */}
        <div style={{
          flexShrink: 0, padding: '1rem 3.5rem',
          borderTop: '1px solid rgba(99,102,241,0.08)',
          background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {[
            { icon: <ShieldCheck size={14} color="#10b981"/>,   text: 'SHAP-Powered Explainability',  color: '#10b981' },
            { icon: <Zap size={14} color="#6366f1"/>,           text: 'XGBoost ML Model',             color: '#6366f1' },
            { icon: <Activity size={14} color="#ec4899"/>,      text: 'Real-time Risk Scoring',       color: '#ec4899' },
            { icon: <TrendingUp size={14} color="#06b6d4"/>,    text: 'Probability Waterfall Chart',  color: '#06b6d4' },
            { icon: <Target size={14} color="#8b5cf6"/>,        text: '12 Financial Features',        color: '#8b5cf6' },
            { icon: <Lock size={14} color="#f59e0b"/>,          text: 'Secure & Private',             color: '#f59e0b' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {f.icon}
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FORM MODAL ══════════════════════════════════════ */}
      {showFormModal && (
        <div className="modal-overlay">
          <div style={{
            background: 'white', border: '1px solid rgba(226,232,240,1)',
            borderRadius: '24px', width: '95vw', maxWidth: '1100px',
            overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.05)',
            animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.5rem 2rem', borderBottom: '1px solid rgba(226,232,240,1)',
              background: '#f8fafc',
            }}>
              <div>
                <h2 className="outfit" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Applicant Data Intake</h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>Fill all parameters below to generate an AI risk profile.</p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(226,232,240,1)', background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form body */}
            <div style={{ padding: '2rem' }}>
              <form onSubmit={handlePredict}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.75rem' }}>
                  
                  {/* Col 1 — Personal */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>Personal Info</div>
                    {[
                      { id: 'applicant_name', label: 'Full Name', type: 'text', placeholder: 'e.g. Arjun Sharma', required: true, pattern: '^[a-zA-Z\\s\\.\\-]+$' },
                      { id: 'person_age', label: 'Age', type: 'number', placeholder: '28', min: 18, max: 100 },
                    ].map(f => (
                      <div key={f.id} style={{ marginBottom: '1rem' }}>
                        <label htmlFor={f.id} className="form-label">{f.label}</label>
                        <input id={f.id} name={f.id} type={f.type} placeholder={f.placeholder}
                          min={(f as any).min} max={(f as any).max}
                          pattern={(f as any).pattern} title={(f as any).title}
                          required={f.required !== false}
                          className="glass-input" />
                      </div>
                    ))}
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="person_home_ownership" className="form-label">Home Ownership</label>
                      <select id="person_home_ownership" name="person_home_ownership" required className="glass-input" defaultValue="">
                        <option value="" disabled>Select…</option>
                        <option value="RENT">Rent</option><option value="OWN">Own</option>
                        <option value="MORTGAGE">Mortgage</option><option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Col 2 — Financial */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(236,72,153,0.2)' }}>Financial Profile</div>
                    {[
                      { id: 'person_income', label: 'Annual Income ($)', type: 'number', placeholder: '65000', min: 1000, max: 10000000 },
                      { id: 'person_emp_length', label: 'Employment Length (yrs)', type: 'number', placeholder: '5.5', min: 0, max: 80, step: 0.1 },
                      { id: 'cb_person_cred_hist_length', label: 'Credit History (yrs)', type: 'number', placeholder: '4', min: 0, max: 80, step: 0.1 },
                    ].map(f => (
                      <div key={f.id} style={{ marginBottom: '1rem' }}>
                        <label htmlFor={f.id} className="form-label">{f.label}</label>
                        <input id={f.id} name={f.id} type={f.type} placeholder={f.placeholder}
                          min={(f as any).min} max={(f as any).max} step={(f as any).step}
                          required className="glass-input" />
                      </div>
                    ))}
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="cb_person_default_on_file" className="form-label">Historical Default?</label>
                      <select id="cb_person_default_on_file" name="cb_person_default_on_file" required className="glass-input" defaultValue="">
                        <option value="" disabled>Select…</option>
                        <option value="N">No</option><option value="Y">Yes</option>
                      </select>
                    </div>
                  </div>

                  {/* Col 3 — Loan */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>Loan Details</div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="loan_intent" className="form-label">Loan Intent</label>
                      <select id="loan_intent" name="loan_intent" required className="glass-input" defaultValue="">
                        <option value="" disabled>Select…</option>
                        <option value="PERSONAL">Personal</option><option value="EDUCATION">Education</option>
                        <option value="MEDICAL">Medical</option><option value="DEBTCONSOLIDATION">Debt Consolidation</option>
                        <option value="HOMEIMPROVEMENT">Home Improvement</option><option value="VENTURE">Venture</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="loan_grade" className="form-label">Loan Grade</label>
                      <select id="loan_grade" name="loan_grade" required className="glass-input" defaultValue="">
                        <option value="" disabled>Select…</option>
                        <option value="A">A — Lowest Risk (Best)</option>
                        <option value="B">B — Low Risk</option>
                        <option value="C">C — Below Average Risk</option>
                        <option value="D">D — Moderate Risk</option>
                        <option value="E">E — High Risk</option>
                        <option value="F">F — Very High Risk</option>
                        <option value="G">G — Highest Risk (Worst)</option>
                      </select>
                    </div>
                    {[
                      { id: 'loan_amnt', label: 'Loan Amount ($)', placeholder: '15000', min: 100, max: 1000000 },
                      { id: 'loan_int_rate', label: 'Interest Rate (%)', placeholder: '10.5', min: 0, max: 50, step: 0.01 },
                    ].map(f => (
                      <div key={f.id} style={{ marginBottom: '1rem' }}>
                        <label htmlFor={f.id} className="form-label">{f.label}</label>
                        <input id={f.id} name={f.id} type="number" placeholder={f.placeholder}
                          min={f.min} max={f.max} step={(f as any).step}
                          required className="glass-input" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <button type="submit" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    color: 'white', border: 'none', padding: '0.85rem 2.5rem',
                    borderRadius: '50px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 10px 30px rgba(99,102,241,0.4)', fontFamily: 'Inter, sans-serif',
                  }}>
                    <Zap size={16} /> Run AI Analysis
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESULT MODAL ════════════════════════════════════ */}
      {showResultModal && (
        <div className="modal-overlay">
          <div style={{
            background: 'white',
            border: '1px solid rgba(226,232,240,1)',
            borderRadius: '28px',
            width: '98vw', maxWidth: '1100px',
            maxHeight: '96vh',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column',
            animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

            {/* ── Top chrome bar ──────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.75rem', flexShrink: 0,
              borderBottom: '1px solid rgba(226,232,240,1)',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)', animation: 'pulse 2s infinite' }}></div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Risk Assessment</span>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(226,232,240,1)', background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* ── LOADING ──────────────────────────────────── */}
            {isPredicting && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '4rem' }}>
                <div style={{ position: 'relative', width: 60, height: 60 }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.15)' }}></div>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#6366f1', animation: 'spin 0.9s linear infinite' }}></div>
                  <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#ec4899', animation: 'spin 1.4s linear infinite reverse' }}></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Analysing Application…</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>Running XGBoost inference + SHAP explainability</div>
                </div>
              </div>
            )}

            {/* ── RESULT ───────────────────────────────────── */}
            {!isPredicting && predResult && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* LEFT PANEL — Hero score + metadata */}
                <div style={{
                  width: '280px', flexShrink: 0,
                  background: heroGrad,
                  display: 'flex', flexDirection: 'column',
                  padding: '2rem 1.75rem',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Decorative circles */}
                  <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', top: -60, right: -60, pointerEvents: 'none' }}></div>
                  <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: 10, right: -20, pointerEvents: 'none' }}></div>

                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '16px',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.2)',
                  }}>
                    {isApprove ? <ShieldCheck size={26} color="white" /> : <AlertCircle size={26} color="white" />}
                  </div>

                  {/* Decision */}
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>AI Decision</div>
                  <div className="outfit" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: '0.75rem' }}>
                    {isApprove ? 'Loan\nApproved ✅' : 'Loan\nRejected ❌'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '2rem' }}>
                    {predResult.message}
                  </div>

                  {/* Score ring */}
                  <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 1.5rem auto' }}>
                    <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9"/>
                      <circle cx="55" cy="55" r="46" fill="none"
                        stroke="white" strokeWidth="9" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 46}`}
                        strokeDashoffset={`${2 * Math.PI * 46 * (1 - predResult.score / 100)}`}
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,1,0.5,1)' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="outfit" style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{predResult.score}</span>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.05em' }}>/ 100 RISK</span>
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { label: 'Risk Level', val: predResult.level },
                      { label: 'Default Prob', val: predResult.default_probability || '—' },
                      { label: 'App ID', val: predResult.customer_id ? `#${predResult.customer_id}` : '—' },
                    ].map(m => (
                      <div key={m.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.75rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(6px)',
                      }}>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{m.label}</span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT PANEL — Combined Reasons + Waterfall */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {predResult.top_reasons && predResult.top_reasons.length > 0 && predResult.shap_explanation ? (
                    <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr', overflow: 'hidden' }}>
                      
                      {/* ── COMBINED: top section split into 2 columns ──── */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

                        {/* ── Left half: Reason cards ──────────────────── */}
                        <div style={{ padding: '1.5rem', borderRight: '1px solid rgba(226,232,240,1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexShrink: 0 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Why This Decision?</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1, alignContent: 'start' }}>
                            {predResult.top_reasons.map((r, i) => {
                              const { isRisk, feature, detail, pct } = parseReason(r);
                              return (
                                <div key={i} style={{
                                  padding: '0.7rem 0.85rem', borderRadius: '12px',
                                  background: isRisk ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                                  border: `1px solid ${isRisk ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                }}>
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.15rem 0.5rem', borderRadius: '20px', marginBottom: '0.35rem',
                                    background: isRisk ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                    fontSize: '0.68rem', fontWeight: 800,
                                    color: isRisk ? '#f87171' : '#34d399',
                                  }}>
                                    {isRisk ? '↑' : '↓'} {pct}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.25rem' }}>{feature}</div>
                                  <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>{detail}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── Right half: Waterfall bars ───────────────── */}
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }}></div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk Waterfall</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                              Base {Math.round(predResult.shap_explanation.base_value)}% → {predResult.default_probability}
                            </span>
                          </div>

                          {/* Chart */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                            {/* Grid lines */}
                            {[0,25,50,75,100].map(v => (
                              <div key={v} style={{ position: 'absolute', top: 0, bottom: 28, left: `calc(${v}% * (100% - 130px) / 100% + 130px)`, width: '1px', background: 'rgba(0,0,0,0.05)', zIndex: 0 }}>
                                <span style={{ position: 'absolute', bottom: -18, left: -8, fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600 }}>{v}%</span>
                              </div>
                            ))}

                            {/* Bars */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem', flex: 1 }}>
                              {/* Base */}
                              <WaterfallRow
                                label="Avg Population"
                                barLeft={0}
                                barWidth={Math.min(predResult.shap_explanation.base_value, 100)}
                                color="rgba(148,163,184,0.6)"
                                labelColor="#4b5a74"
                                valueLabel={`${Math.round(predResult.shap_explanation.base_value)}%`}
                                valueLabelRight
                              />

                              {/* Feature bars */}
                              {(() => {
                                let pos = predResult.shap_explanation.base_value;
                                return predResult.shap_explanation.features.map((f, i) => {
                                  const inc = f.impact === 'increases_risk';
                                  const w   = Math.min(Math.abs(f.shap_value), 100);
                                  const bl  = Math.max(0, Math.min(inc ? pos : pos - w, 100 - w));
                                  if (inc) pos = Math.min(pos + w, 100); else pos = Math.max(pos - w, 0);
                                  return (
                                    <WaterfallRow
                                      key={i}
                                      label={f.feature}
                                      tooltip={f.reason || f.feature}
                                      barLeft={bl}
                                      barWidth={Math.max(w, 0.5)}
                                      color={inc ? '#ef4444' : '#10b981'}
                                      glowColor={inc ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}
                                      labelColor={inc ? '#f87171' : '#34d399'}
                                      valueLabel={`${inc ? '+' : '-'}${Math.round(w)}%`}
                                      valueLabelRight={inc}
                                    />
                                  );
                                });
                              })()}
                            </div>

                            {/* Final score arrow */}
                            <div style={{ height: '26px', position: 'relative', marginTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.4rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4b5a74', position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>Final Score</span>
                              <div style={{
                                position: 'absolute',
                                left: `clamp(140px, calc(130px + ${parseInt(predResult.default_probability || '0')}% * (100% - 130px) / 100), 100%)`,
                                top: 0, bottom: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                              }}>
                                <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${isApprove ? '#10b981' : '#ef4444'}` }}></div>
                                <span style={{
                                  fontSize: '0.7rem', fontWeight: 900, color: 'white',
                                  background: isApprove ? '#10b981' : '#ef4444',
                                  padding: '1px 7px', borderRadius: '20px',
                                  boxShadow: isApprove ? '0 4px 12px rgba(16,185,129,0.5)' : '0 4px 12px rgba(239,68,68,0.5)',
                                  whiteSpace: 'nowrap',
                                }}>{predResult.default_probability}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                      No SHAP explanation available
                    </div>
                  )}

                  {/* Close button strip */}
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(99,102,241,0.08)', flexShrink: 0, background: '#fafbff' }}>
                    <button
                      onClick={() => setShowResultModal(false)}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'white', border: '1px solid rgba(99,102,241,0.15)',
                        color: '#334155', borderRadius: '12px', fontWeight: 600, fontSize: '0.88rem',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s ease',
                        letterSpacing: '0.02em', boxShadow: '0 1px 3px rgba(99,102,241,0.06)',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f6ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)'; }}
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline CSS overrides */}
      <style>{`
        select.glass-input { appearance: auto; cursor: pointer; }
        .glass-input { color: #0f172a !important; }
        .glass-input option { background: #ffffff; color: #0f172a; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes popIn { from{opacity:0;transform:scale(0.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Waterfall Row Sub-component
───────────────────────────────────────────────────────── */
function WaterfallRow({
  label, tooltip, barLeft, barWidth, color, glowColor, labelColor, valueLabel, valueLabelRight,
}: {
  label: string; tooltip?: string; barLeft: number; barWidth: number;
  color: string; glowColor?: string; labelColor: string;
  valueLabel: string; valueLabelRight: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: '20px' }}>
      <div style={{ width: '130px', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', flexShrink: 0, paddingRight: '0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tooltip || label}>
        {label}
      </div>
      <div style={{ flex: 1, position: 'relative', height: '14px' }}>
        <div style={{
          position: 'absolute',
          left: `${barLeft}%`, top: 0, height: '100%',
          width: `${barWidth}%`,
          background: color,
          borderRadius: '4px',
          boxShadow: glowColor ? `0 0 8px ${glowColor}` : 'none',
          transition: 'width 0.7s cubic-bezier(0.25,1,0.5,1), left 0.7s cubic-bezier(0.25,1,0.5,1)',
        }}></div>
        <span style={{
          position: 'absolute',
          left: valueLabelRight ? `calc(${barLeft + barWidth}% + 4px)` : `calc(${barLeft}% - 36px)`,
          top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.62rem', fontWeight: 800, color: labelColor, whiteSpace: 'nowrap',
        }}>
          {valueLabel}
        </span>
      </div>
    </div>
  );
}

export default Landing;
