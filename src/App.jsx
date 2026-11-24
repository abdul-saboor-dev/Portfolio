import KineticHero from './components/KineticHero.jsx';
import { usePortfolioContent } from './cms/index.js';

function App() {
  const { content, status } = usePortfolioContent();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to portfolio
      </a>
      <main id="main-content" aria-label="Abdul Saboor portfolio" tabIndex="-1">
        <KineticHero
          about={content.about}
          education={content.education}
          skills={content.skills}
          skillsPresentation={content.skillsPresentation}
          profile={content.profile}
          contentStatus={status}
        />
      </main>
    </>
  );
}

export default App;
