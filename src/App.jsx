import IntroScene from './scenes/introduction/IntroScene.jsx';

function App() {
  return (
    <main className="site-shell">
      <a className="skip-link" href="#intro-scene">
        Skip to introduction
      </a>

      <header className="site-header" aria-label="Portfolio status">
        <p className="site-header__label">Portfolio / 00</p>
        <p className="site-header__status">Experience in progress</p>
      </header>

      <IntroScene />
    </main>
  );
}

export default App;
