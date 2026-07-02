import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Terminal, Key, CheckCircle, Copy, Check, Zap } from 'lucide-react';

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
  const [activeTab, setActiveTab] = React.useState<'macos' | 'windows'>('macos');

  const macosSteps = [
    {
      icon: <Download className="text-gradient-accent" size={24} />,
      title: '1. Download & Install',
      description: 'Download the latest Piik .dmg from the link above. Open it, and drag Piik into your Applications folder.'
    },
    {
      icon: <Terminal className="text-gradient-accent" size={24} />,
      title: '2. Remove Quarantine',
      description: (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
            color: '#f87171'
          }}>
            <strong>Important:</strong> If you see a message saying <strong>"Piik is damaged and can't be opened"</strong>, don't worry! This is the default macOS warning for unsigned apps. To fix it, run:
          </div>
          <div className="code-container-wrapper" style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px', 
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

  const windowsSteps = [
    {
      icon: <Download className="text-gradient-accent" size={24} />,
      title: '1. Download & Install',
      description: 'Download the latest Piik .exe installer from the link above. Double-click the installer to set up Piik on your laptop.'
    },
    {
      icon: <Zap className="text-gradient-accent" size={24} />,
      title: '2. Launch from System Tray',
      description: 'Search for Piik in your Start Menu and open it. Piik runs as a system tray utility in the bottom right corner of your taskbar.'
    },
    {
      icon: <Key className="text-gradient-accent" size={24} />,
      title: '3. Generate a PAT',
      description: "In Azure DevOps, go to User Settings -> Personal Access Tokens. Create a new token with 'Work Items (Read & Write)' access."
    },
    {
      icon: <CheckCircle className="text-gradient-accent" size={24} />,
      title: '4. Setup in Piik',
      description: 'Click the Piik icon in your Windows system tray, click the settings gear icon, enter your Organization name and PAT, and click Save.'
    }
  ];

  const steps = activeTab === 'macos' ? macosSteps : windowsSteps;

  return (
    <section id="install" style={{ padding: '6rem 0', background: 'rgba(255,255,255,0.02)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="text-gradient">Get Started in Minutes</h2>
          <p style={{ margin: '0 auto 2rem auto' }}>No complicated setup. Just connect your token and go.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setActiveTab('macos')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: activeTab === 'macos' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                background: activeTab === 'macos' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'macos' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg viewBox="0 0 384 512" width="14" height="14" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.9-77-22.9-37.9 0-76.9 22-97.4 58.2-39.7 70.3-10.2 173.2 28.3 229.2 19 27.5 41 57.5 70.5 56.4 28.1-1.1 38.8-18.2 71.1-18.2 32.1 0 42.1 18.2 71.2 18.2 30.3 0 50.1-27.2 69-54.8 21.8-31.7 30.7-62.6 31.1-64.2-1-1.2-59.8-23-60-84.7zM249.2 88.5c19-23.3 31.7-55.4 27.5-88.5-28.2 1.1-62.8 19-83 42.4-17.2 19.5-32.3 52.1-27.8 84.7 31.3 2.5 64.3-15.3 83.3-38.6z"/>
              </svg>
              macOS
            </button>
            <button 
              onClick={() => setActiveTab('windows')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: activeTab === 'windows' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                background: activeTab === 'windows' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                color: activeTab === 'windows' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor">
                <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28.1L448 480V268.4H203.8v178zm0-380.6v177.4H448V32L203.8 65.8z"/>
              </svg>
              Windows
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {steps.map((step, i) => (
            <motion.div 
              key={`${activeTab}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
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
