import React from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Hero: React.FC = () => {
  return (
    <section id="home" style={{ 
      position: 'relative', 
      paddingTop: '12rem', 
      paddingBottom: '6rem',
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="bg-gradient-orb"></div>
      
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="badge">
            <span style={{ marginRight: '0.5rem', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-glow)', boxShadow: '0 0 10px var(--primary-glow)' }}></span>
            Piik v0.1.0 is now available
          </span>
        </motion.div>

        <motion.h1 
          className="text-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ maxWidth: '800px', margin: '0 auto 1.5rem auto' }}
        >
          Azure DevOps, right in your Mac's <span className="text-gradient-accent">Menu Bar</span>.
        </motion.h1>

        <motion.p 
          style={{ margin: '0 auto 3rem auto', fontSize: '1.25rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Lightning fast access to your tasks, stories, and bugs. Piik natively integrates with Azure DevOps to give you the context you need without context switching.
        </motion.p>

        <motion.div 
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <a href="/Piik.dmg" download="Piik.dmg" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <Download size={20} />
            Download for macOS
          </a>
          <a href="#features" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: 'transparent', border: 'none', gap: '0.25rem' }}>
            View Features <ChevronRight size={20} />
          </a>
        </motion.div>
        
        {/* App Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{ marginTop: '5rem', perspective: '1000px' }}
        >
          <div className="glass-panel" style={{ 
            maxWidth: '400px', 
            margin: '0 auto', 
            height: '524px', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Mock Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#ff3b30' }}></div> {/* Placeholder Profile */}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>Assigned To Me</div>
              <div style={{ width: '20px' }}></div>
            </div>
            {/* Mock Content */}
            <div style={{ flex: 1, background: '#07090f', padding: '1rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel" style={{ padding: '1rem', marginBottom: '0.75rem', borderRadius: '12px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>#{14300 + i}</span> 
                    <span style={{ padding: '2px 6px', background: 'rgba(59,130,246,0.1)', borderRadius: '4px' }}>Task</span>
                  </div>
                  <div style={{ color: 'white', fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    Update the Piik landing page with premium design
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', color: '#94a3b8' }}>Active</div>
                    <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', color: '#94a3b8' }}>Website</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
