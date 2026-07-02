import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Hero: React.FC = () => {
  const [latestVersion, setLatestVersion] = React.useState('v0.3.6');
  const [macDownloadUrl, setMacDownloadUrl] = React.useState('https://github.com/rjbtechconsult/piik/releases/download/v0.3.6/Piik_0.3.6_aarch64.dmg');
  const [winDownloadUrl, setWinDownloadUrl] = React.useState('https://github.com/rjbtechconsult/piik/releases/download/v0.3.6/Piik_0.3.6_x64-setup.exe');

  React.useEffect(() => {
    // Check for mock parameter for local testing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mock') === 'true') {
      setLatestVersion('v0.3.6-mock');
      setMacDownloadUrl('/Piik_0.3.6_aarch64.dmg');
      setWinDownloadUrl('/Piik_0.3.6_x64-setup.exe');
      return;
    }

    fetch('https://api.github.com/repos/rjbtechconsult/piik/releases/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.tag_name) {
          setLatestVersion(data.tag_name);
        }
        if (data && data.assets) {
          const dmgAsset = data.assets.find((asset: any) => asset.name.endsWith('.dmg'));
          const exeAsset = data.assets.find((asset: any) => asset.name.endsWith('.exe'));
          
          if (dmgAsset) {
            setMacDownloadUrl(dmgAsset.browser_download_url);
          }
          if (exeAsset) {
            setWinDownloadUrl(exeAsset.browser_download_url);
          } else {
            // Fallback to general releases page if Windows exe is not yet compiled for the latest release
            setWinDownloadUrl('https://github.com/rjbtechconsult/piik/releases');
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching latest release assets:', err);
      });
  }, []);

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
            Piik {latestVersion} is now available
          </span>
        </motion.div>

        <motion.h1 
          className="text-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ maxWidth: '850px', margin: '0 auto 1.5rem auto' }}
        >
          Azure DevOps, right in your <span className="text-gradient-accent">Menu Bar & Tray</span>.
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
          className="hero-buttons-container"
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <a href={macDownloadUrl} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor" style={{ marginRight: '0.25rem' }}>
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.9-77-22.9-37.9 0-76.9 22-97.4 58.2-39.7 70.3-10.2 173.2 28.3 229.2 19 27.5 41 57.5 70.5 56.4 28.1-1.1 38.8-18.2 71.1-18.2 32.1 0 42.1 18.2 71.2 18.2 30.3 0 50.1-27.2 69-54.8 21.8-31.7 30.7-62.6 31.1-64.2-1-1.2-59.8-23-60-84.7zM249.2 88.5c19-23.3 31.7-55.4 27.5-88.5-28.2 1.1-62.8 19-83 42.4-17.2 19.5-32.3 52.1-27.8 84.7 31.3 2.5 64.3-15.3 83.3-38.6z"/>
            </svg>
            macOS (.dmg)
          </a>
          <a href={winDownloadUrl} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)', boxShadow: '0 4px 14px rgba(0, 120, 212, 0.4)' }}>
            <svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor" style={{ marginRight: '0.25rem' }}>
              <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28.1L448 480V268.4H203.8v178zm0-380.6v177.4H448V32L203.8 65.8z"/>
            </svg>
            Windows (.exe)
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
            maxWidth: '360px', 
            margin: '0 auto', 
            height: '520px', 
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(59, 130, 246, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(20, 20, 22, 0.95)',
            textAlign: 'left'
          }}>
            {/* App Header */}
            <div style={{ background: 'rgba(28, 28, 30, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#007aff' }}></div>
                  Piik Team
                  <ChevronRight size={10} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9c-2.67 0-5.1-1.1-6.8-2.9L3 16"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 1 9-9c2.67 0 5.1 1.1 6.8 2.9L21 8"></path><path d="M21 21v-5h-5"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                </div>
              </div>
              
              {/* Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '24px', height: '12px', background: '#007aff', borderRadius: '12px', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', background: 'white', borderRadius: '50%', position: 'absolute', right: '1px', top: '1px' }}></div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'white', fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  Sprint 24 <ChevronRight size={10} style={{ verticalAlign: 'middle', transform: 'rotate(90deg)' }} />
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '0.75rem', overflow: 'hidden' }}>
              {/* User Story Card */}
              <div style={{ 
                background: '#1c1c1e', 
                border: '1px solid #007aff', 
                borderRadius: '12px', 
                padding: '1rem',
                position: 'relative',
                boxShadow: '0 0 20px rgba(0, 122, 255, 0.1)',
                marginBottom: '1rem'
              }}>
                <div style={{ position: 'absolute', left: 0, top: '1rem', bottom: '1rem', width: '3px', background: '#007aff', borderRadius: '0 4px 4px 0' }}></div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ color: '#007aff', marginTop: '2px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, background: 'rgba(0,122,255,0.2)', color: '#007aff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>Story</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>#14301 • Piik</span>
                        </div>
                        <div style={{ color: 'white', fontSize: '12px', fontWeight: 700, lineHeight: 1.4, marginBottom: '0.75rem' }}>
                          Implement native macOS menu bar integration
                        </div>
                      </div>
                      <div style={{ 
                        flexShrink: 0, 
                        padding: '2px 6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        borderRadius: '6px', 
                        background: 'rgba(0,122,255,0.1)', 
                        color: '#007aff', 
                        border: '1px solid rgba(0,122,255,0.2)',
                        marginTop: '2px'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>Task</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.2)', padding: '2px 8px', borderRadius: '20px' }}>
                        <div style={{ width: '4px', height: '4px', background: '#007aff', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '9px', color: '#007aff', fontWeight: 800, textTransform: 'uppercase' }}>Active</span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Justice Markwei</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-tasks */}
              <div style={{ marginLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Sub Tasks</div>
                
                {[
                  { id: 14302, title: "Create system tray icon", status: "Active" },
                  { id: 14303, title: "Handle window positioning", status: "Active" }
                ].map((task) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.25rem', borderRadius: '6px' }}>
                    <div style={{ color: '#007aff', marginTop: '2px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontSize: '11px', fontWeight: 500, marginBottom: '0.25rem' }}>{task.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>#{task.id}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                          <div style={{ width: '3px', height: '3px', background: '#007aff', borderRadius: '50%' }}></div>
                          <span style={{ fontSize: '8px', color: '#007aff', fontWeight: 700, textTransform: 'uppercase' }}>Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
