import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Terminal, Key, CheckCircle, Copy, Check } from 'lucide-react';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: copied ? '#10b981' : 'rgba(255,255,255,0.6)',
        fontSize: '0.75rem',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Check size={12} />
            <span className="hide-mobile">Copied!</span>
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Copy size={12} />
            <span className="hide-mobile">Copy</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

export const InstallGuide: React.FC = () => {
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>macOS might block the app since it's an unsigned release. Open Terminal and run:</span>
          <div className="code-container-wrapper" style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px', 
            marginTop: '0.75rem', 
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <code style={{ fontSize: '0.85rem', color: '#3b82f6', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              xattr -cr /Applications/Piik.app
            </code>
            <CopyButton text="xattr -cr /Applications/Piik.app" />
          </div>
        </div>
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

  return (
    <section id="install" style={{ padding: '6rem 0', background: 'rgba(255,255,255,0.02)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="text-gradient">Get Started in Minutes</h2>
          <p style={{ margin: '0 auto' }}>No complicated setup. Just connect your token and go.</p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              className="install-step-container" 
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{step.title}</h3>
                <div style={{ color: 'var(--text-secondary)' }}>{step.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
