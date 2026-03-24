import React from 'react';
import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState('home');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-30% 0px -30% 0px' }
    );

    const sections = ['home', 'release-notes', 'features', 'install'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  const navLinkStyle = (id: string): React.CSSProperties => ({
    color: activeSection === id ? 'white' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    fontWeight: activeSection === id ? 600 : 400,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  });

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '1rem 0'
      }}
    >
      <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0.75rem 2rem',
          width: '100%',
          maxWidth: '800px',
          borderRadius: '999px'
        }}>
          <a href="#home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 700, fontSize: '1.25rem', textDecoration: 'none' }}>
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Piik Logo" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            Piik
          </a>

          <div style={{ display: 'flex', gap: 'clamp(1rem, 3vw, 2rem)', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 'clamp(0.75rem, 2vw, 1.5rem)', alignItems: 'center' }}>
              <a href="#release-notes" style={navLinkStyle('release-notes')}>
                What's New
                {activeSection === 'release-notes' && (
                  <motion.div layoutId="activeNav" style={{ position: 'absolute', bottom: '-4px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-glow)' }} />
                )}
              </a>
              <a href="#features" style={navLinkStyle('features')}>
                Features
                {activeSection === 'features' && (
                  <motion.div layoutId="activeNav" style={{ position: 'absolute', bottom: '-4px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-glow)' }} />
                )}
              </a>
              <a href="#install" style={navLinkStyle('install')}>
                Install
                {activeSection === 'install' && (
                  <motion.div layoutId="activeNav" style={{ position: 'absolute', bottom: '-4px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-glow)' }} />
                )}
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
