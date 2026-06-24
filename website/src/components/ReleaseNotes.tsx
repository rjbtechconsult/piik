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
          <span className="badge">v0.3.4 Update</span>
          <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>Detailed Report Filtering & Export</h2>
          <p style={{ margin: '0 auto', maxWidth: '600px' }}>
            Introducing advanced filtering for work item reports. You can now filter exports by specific Stories/Epics and team Assignees, and track completion with the new Closed Date column.
          </p>
        </motion.div>
 
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
           {/* Card 1: Story & Epic Filtering */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Story & Epic Filtering</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Filter your reports dynamically in the UI and CSV downloads by selecting one or more parent User Stories, Backlog Items, or Epics worked on during the period.
             </p>
           </motion.div>
 
           {/* Card 2: Assignee Filtering */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Assignee Filtering</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Narrow down your report list by individual team members (e.g. UX Engineering). Check workloads and export assignee-specific CSVs instantly.
             </p>
           </motion.div>
 
           {/* Card 3: Closed Date Column */}
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
             <h3 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.1rem' }}>Closed Date Tracking</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Exported CSV files now include a dedicated Closed Date column immediately following Created Date to easily identify when tasks were completed.
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
            Latest Release: June 24, 2026
          </div>
        </motion.div>
      </div>
    </section>
  );
};
