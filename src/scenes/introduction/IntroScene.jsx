import SceneFrame from '../../components/SceneFrame.jsx';
import { narrativeActs } from '../../config/narrativeActs.js';

function IntroScene() {
  const introduction = narrativeActs[0];

  return (
    <SceneFrame
      id="intro-scene"
      className="intro-scene"
      eyebrow={`${introduction.index} / ${String(narrativeActs.length).padStart(2, '0')} — ${introduction.label}`}
      title={<>A portfolio<br /><em>in progress.</em></>}
    >
      <div className="intro-scene__content">
        <p>
          A cinematic space for work, process, and experiments — built in layers,
          one scroll at a time.
        </p>
        <div className="intro-scene__rule" aria-hidden="true" />
        <p className="intro-scene__note">Scroll-led experience / foundation phase</p>
      </div>
    </SceneFrame>
  );
}

export default IntroScene;
