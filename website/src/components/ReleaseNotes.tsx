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
          <span className="badge">v0.2.1 Update</span>
          <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>Inline Editing & UI Stability</h2>
          <p style={{ margin: '0 auto', maxWidth: '600px' }}>
            A major leap in productivity with in-place editing and a deterministic layout engine for consistent navigation.
          </p>
        </motion.div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
           {/* Card 1: Inline Editing */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Inline Title Editing</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Edit your stories, tasks, and bugs directly in the Hierarchy Explorer. No more context switching to Azure DevOps—just click, edit, and save.
             </p>
           </motion.div>

           {/* Card 2: Deterministic Stability */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Rock-Solid Stability</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Implemented recursive stable sorting by ID across our backend and frontend. Your items stay exactly where you left them, even during silent background refreshes.
             </p>
           </motion.div>

           {/* Card 3: UX & Performance */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>UX Refinements</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Full title visibility for all work items with smart text-wrapping, combined with pointer cursors and optimized icon placement for a truly premium experience.
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
            Latest Release: March 25, 2026
          </div>
        </motion.div>
      </div>
    </section>
  );
};
