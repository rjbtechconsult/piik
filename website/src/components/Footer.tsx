import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ 
      padding: '3rem 0', 
      borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-dark)'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ color: 'white', fontWeight: 600 }}>
          Piik <span style={{ color: 'var(--text-muted)' }}>— Native ADO Client</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <img 
            src="https://img.shields.io/github/downloads/rjbtechconsult/piik/total?style=flat-square&color=3b82f6&label=Downloads" 
            alt="GitHub Downloads" 
            style={{ height: '20px', borderRadius: '3px' }}
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            © {new Date().getFullYear()} Piik. Built by <a href="https://justicemarkwei.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Justice Markwei</a>.
          </div>
        </div>
      </div>
    </footer>
  );
};
