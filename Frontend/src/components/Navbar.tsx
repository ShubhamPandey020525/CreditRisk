import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="navbar-search">
        <Search size={18} className="text-muted" />
        <input type="text" placeholder="Search assessments, clients..." />
      </div>

      <div className="flex items-center gap-4">
        <button className="glass-button icon-only">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
          <div className="glass-panel" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Admin User</div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Risk Analyst</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
