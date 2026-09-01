import React, { useState, useEffect } from 'react';
import { Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_assessments: 0,
    high_risk_clients: 0,
    total_active_clients: 0
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch("http://localhost:8000/api/dashboard-stats"),
          fetch("http://localhost:8000/api/applications/history")
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="page-container">
      <h1 className="heading-1">Dashboard Overview</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Welcome back. Here's what's happening with your credit risk portfolio.</p>

      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div>
              <div className="form-label">Total Assessments</div>
              <div className="stat-value">{loading ? '...' : stats.total_assessments.toLocaleString()}</div>
            </div>
            <div className="stat-icon">
              <Activity size={24} />
            </div>
          </div>
          <div className="stat-trend text-success">
            <TrendingUp size={16} />
            <span>Up to date</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div>
              <div className="form-label">High Risk Clients</div>
              <div className="stat-value">{loading ? '...' : stats.high_risk_clients.toLocaleString()}</div>
            </div>
            <div className="stat-icon" style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="stat-trend text-danger">
            <TrendingUp size={16} />
            <span>Action Required</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <div>
              <div className="form-label">Total Active Clients</div>
              <div className="stat-value">{loading ? '...' : stats.total_active_clients.toLocaleString()}</div>
            </div>
            <div className="stat-icon" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>
              <Users size={24} />
            </div>
          </div>
          <div className="stat-trend text-success">
            <TrendingUp size={16} />
            <span>Stable</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6" style={{ marginTop: '2rem' }}>
        <div className="glass-panel w-full" style={{ padding: '1.5rem', minHeight: '300px' }}>
          <h2 className="heading-2">Recent Assessments</h2>
          <p className="text-muted">A summary of the most recent credit risk evaluations.</p>
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <div className="text-muted">Loading recent applications...</div>
            ) : history.length === 0 ? (
              <div className="text-muted">No applications found in the current session.</div>
            ) : (
              history.map((app, i) => (
                <div key={app.id || i} className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(15,23,42,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex items-center gap-4">
                    <div className="glass-panel" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{app.applicant_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>Amount: ${app.loan_amnt?.toLocaleString()} • {new Date(app.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={app.risk_level === 'High' ? 'text-danger' : app.risk_level === 'Low' ? 'text-success' : 'text-warning'} style={{ fontWeight: 600 }}>
                    {app.risk_level} Risk ({app.risk_score})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
