
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ReleaseNotes } from './components/ReleaseNotes';
import { Features } from './components/Features';
import { InstallGuide } from './components/InstallGuide';
import { Footer } from './components/Footer';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Hero />
        <ReleaseNotes />
        <Features />
        <InstallGuide />
      </main>
      <Footer />
    </div>
  );
}

export default App;
