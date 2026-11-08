import IntroScene from './scenes/introduction/IntroScene.jsx';

function App() {
  return (
    <main className="site-shell">
      <a className="skip-link" href="#intro-end">
        Skip introduction
      </a>

      <IntroScene />
    </main>
  );
}

export default App;
