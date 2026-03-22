import React from 'react';
import { motion } from 'framer-motion';
import { Download, Terminal, Key, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: <Download className="text-gradient-accent" size={24} />,
    title: '1. Download & Install',
    description: 'Download the latest Piik .dmg from GitHub Releases. Open it, and drag Piik into your Applications folder.'
  },
  {
    icon: <Terminal className="text-gradient-accent" size={24} />,
    title: '2. Remove Quarantine',
    description: (
      <>
        macOS might block the app since it's an unsigned release. Open Terminal and run:
        <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}>
          xattr -cr /Applications/Piik.app
        </code>
      </>
    )
  },
  {
    icon: <Key className="text-gradient-accent" size={24} />,
    title: '3. Generate a PAT',
    description: "In Azure DevOps, go to User Settings -> Personal Access Tokens. Create a new token with 'Work Items (Read & Write)' access."
  },
  {
    icon: <CheckCircle className="text-gradient-accent" size={24} />,
    title: '4. Setup in Piik',
    description: 'Open Piik from your menu bar. Click the settings gear icon, enter your Organization name and PAT, and click Save.'
  }
];

export const InstallGuide: React.FC = () => {
  return (
    <section id="install" style={{ padding: '6rem 0', background: 'rgba(255,255,255,0.02)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="text-gradient">Get Started in Minutes</h2>
          <p style={{ margin: '0 auto' }}>No complicated setup. Just connect your token and go.</p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}
            >
              <div style={{ flexShrink: 0 }}>
                <div style={{ 
                  width: '50px', height: '50px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  {step.icon}
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{step.title}</h3>
                <p style={{ margin: 0 }}>{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
