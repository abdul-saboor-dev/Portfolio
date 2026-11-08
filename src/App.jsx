import IntroScene from './scenes/introduction/IntroScene.jsx';
import AboutScene from './scenes/about/AboutScene.jsx';

function App() {
  return (
    <main className="site-shell">
      <a className="skip-link" href="#about">
        Skip introduction
      </a>

      <IntroScene />
      <AboutScene />
    </main>
  );
}

export default App;
