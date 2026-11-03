import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles } from 'lucide-react';

export const ReleaseNotes: React.FC = () => {
  return (
    <section id="release-notes" style={{ padding: '6rem 0', position: 'relative' }}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.5 }}
           style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span className="badge">v0.3.8 Update</span>
          <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>macOS 27 Compatibility & Tray Improvements</h2>
          <p style={{ margin: '0 auto', maxWidth: '600px' }}>
            Full compatibility with macOS 27 Golden Gate, restored menu bar tray click interactions, quick-action drawer opening, and Spotlight reopen handling.
          </p>
        </motion.div>
 
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
           {/* Card 1: macOS 27 Compatibility */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="glass-panel"
             style={{ padding: '2rem' }}
           >
             <div style={{ 
               width: '3rem', 
               height: '3rem', 
               backgroundColor: 'rgba(59, 130, 246, 0.1)', 
               borderRadius: '12px', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               color: 'var(--accent-blue)',
               marginBottom: '1.5rem'
             }}>
               <Zap size={24} />
             </div>
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>macOS 27 Scene Support</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Seamless integration with macOS 27 Golden Gate's unified status bar architecture, ensuring tray click events correctly toggle the application window.
             </p>
           </motion.div>
 
           {/* Card 2: Enhanced Tray Menu */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="glass-panel"
             style={{ padding: '2rem' }}
           >
             <div style={{ 
               width: '3rem', 
               height: '3rem', 
               backgroundColor: 'rgba(139, 92, 246, 0.1)', 
               borderRadius: '12px', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               color: 'var(--accent-purple)',
               marginBottom: '1.5rem'
             }}>
                <Sparkles size={24} />
             </div>
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Enhanced Tray Context Menu</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Context menu now includes a direct "Open Piik" option alongside Quit to guarantee instantaneous access to your Azure DevOps dashboard at all times.
             </p>
           </motion.div>
 
           {/* Card 3: Spotlight & Dock Reopen */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.3 }}
             className="glass-panel"
             style={{ padding: '2rem' }}
           >
             <div style={{ 
               width: '3rem', 
               height: '3rem', 
               backgroundColor: 'rgba(16, 185, 129, 0.1)', 
               borderRadius: '12px', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               color: 'var(--accent-green)',
               marginBottom: '1.5rem'
             }}>
                <Zap size={24} />
             </div>
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Spotlight & Finder Reopen</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Searching for and launching Piik from Spotlight or Applications while running in the background automatically opens and focuses the drawer.
             </p>
           </motion.div>
        </div>
 
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ marginTop: '4rem', textAlign: 'center' }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Latest Release: November 3, 2026
          </div>
        </motion.div>
      </div>
    </section>
  );
};
