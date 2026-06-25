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
          <span className="badge">v0.3.5 Update</span>
          <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>Automatic Iteration Sync</h2>
          <p style={{ margin: '0 auto', maxWidth: '600px' }}>
            Piik now automatically and silently refreshes your iterations from Azure DevOps when you open the window, instantly updating the dropdown list and active sprint selection.
          </p>
        </motion.div>
 
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
           {/* Card 1: Instant Focus Sync */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Instant Focus Sync</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Whenever you open Piik or the app window gains focus, it silently refreshes the iterations list and task hierarchy. No app restart required.
             </p>
           </motion.div>
 
           {/* Card 2: Auto-Switch Current Sprint */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Auto-Switch Current Sprint</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                If a new iteration is selected as current in Azure DevOps, Piik automatically detects the shift and updates your active view to it.
             </p>
           </motion.div>
 
           {/* Card 3: Throttled Sync API */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Throttled Sync API</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Focus sync queries are throttled to once every 10 seconds, keeping Azure DevOps API usage low while ensuring your data stays fresh.
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
            Latest Release: June 25, 2026
          </div>
        </motion.div>
      </div>
    </section>
  );
};
