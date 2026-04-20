export function SplashScreen({ title = 'EtherX Word', logoSrc = '/assets/etherxlogo.png' }) {

  return (
    <div className="splash-screen" role="status" aria-live="polite" aria-label="Loading EtherxWord">
      <div className="splash-content anim-fade-in">
        <div className="splash-logo-wrap">
          <img
            src={logoSrc}
            alt="EtherxWord logo"
            className="splash-logo-image"
          />
        </div>
        <h1 className="splash-title">{title}</h1>
        <div className="splash-subtitle">
          Loading
          <span className="splash-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>
  );
}