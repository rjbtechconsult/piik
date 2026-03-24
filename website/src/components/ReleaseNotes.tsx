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
          <span className="badge">v0.1.8 Update</span>
          <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>Smart Error Handling</h2>
          <p style={{ margin: '0 auto', maxWidth: '600px' }}>
            We've improved how Piik communicates with you, turning technical API errors into helpful setup instructions.
          </p>
        </motion.div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
           {/* Card 1: Smart Error Parsing */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="glass-panel"
             style={{ padding: '2.5rem' }}
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
             <h3 style={{ marginBottom: '1rem', color: 'white' }}>Smart Error Parsing</h3>
             <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Technical API errors are now translated into clear, human-friendly advice. Piik tells you exactly when a PAT token needs updating or an organization name has a typo.
             </p>
           </motion.div>

           {/* Card 2: Context-Aware UI */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="glass-panel"
             style={{ padding: '2.5rem' }}
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
             <h3 style={{ marginBottom: '1rem', color: 'white' }}>Setup Assistance</h3>
             <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                The app now intelligently distinguishes between transient sync issues and setup requirements, guiding you to the right configuration page when needed.
             </p>
           </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginTop: '4rem', textAlign: 'center' }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Latest Release: March 24, 2026
          </div>
        </motion.div>
      </div>
    </section>
  );
};
