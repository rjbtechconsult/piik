import React from 'react';
import { Menu, Zap, Fingerprint, Layers, Cpu, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const featuresList = [
  {
    icon: <Zap size={24} className="text-gradient-accent" />,
    title: "Always Accessible",
    description: "Live inside your native macOS Menu Bar. One click or a hotkey brings up your entire work context."
  },
  {
    icon: <Fingerprint size={24} className="text-gradient-accent" />,
    title: "Native Performance",
    description: "Built with Rust and Tauri. Expect light-speed performance with minimal RAM and CPU overhead compared to Electron apps."
  },
  {
    icon: <Layers size={24} className="text-gradient-accent" />,
    title: "Hierarchy Explorer",
    description: "Visualize Epics, Features, Stories, and Tasks in a clean hierarchical tree to understand the big picture."
  },
  {
    icon: <Compass size={24} className="text-gradient-accent" />,
    title: "Direct ADO Integration",
    description: "Connect via Personal Access Token to load teams, iterations, and tasks securely via Azure's REST APIs."
  },
  {
    icon: <Menu size={24} className="text-gradient-accent" />,
    title: "Floating Overlays",
    description: "Open your tasks over fullscreen applications without switching spaces. (Perfect for presentations and pair programming)."
  },
  {
    icon: <Cpu size={24} className="text-gradient-accent" />,
    title: "Status Updates",
    description: "Change task states directly from the menu bar without waiting for the slow Azure DevOps web interface to load."
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" style={{ padding: '6rem 0', position: 'relative' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="text-gradient">Engineered for Speed</h2>
          <p style={{ margin: '0 auto' }}>Skip the loading screens and 30-second context switches.</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem' 
        }}>
          {featuresList.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-panel"
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}
            >
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                padding: '0.75rem', 
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                 {feature.icon}
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{feature.title}</h3>
              <p style={{ fontSize: '1rem', margin: 0 }}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
