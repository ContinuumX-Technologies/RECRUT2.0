import { Cpu, Lock, Sparkles, Zap } from 'lucide-react';
import './features-6.css';

export function Features() {
  return (
    <section className="f6-section" aria-label="Lyra ecosystem features">
      <div className="f6-container">
        <div className="f6-header-grid">
          <h2 className="f6-title">The Lyra ecosystem brings together our models</h2>
          <p className="f6-subtitle">
            Empower your team with workflows that adapt to your needs, whether you prefer git synchronization or an AI
            Agents interface.
          </p>
        </div>

        <div className="f6-visual-shell">
          <div className="f6-visual-frame">
            <div className="f6-visual-gradient" />
            <img
              src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2200&q=80"
              className="f6-img f6-img-front"
              alt="Developers collaborating on AI workflows"
              width={2200}
              height={900}
              loading="lazy"
            />
            <img
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=80"
              className="f6-img f6-img-back f6-dark-only"
              alt="AI infrastructure visualization"
              width={2200}
              height={900}
              loading="lazy"
            />
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2200&q=80"
              className="f6-img f6-img-back f6-light-only"
              alt="Modern engineering team workflow"
              width={2200}
              height={900}
              loading="lazy"
            />
          </div>
        </div>

        <div className="f6-feature-grid">
          <article className="f6-item">
            <div className="f6-item-head">
              <Zap className="f6-icon" />
              <h3>Faaast</h3>
            </div>
            <p>It supports an entire ecosystem helping developers and teams innovate faster.</p>
          </article>

          <article className="f6-item">
            <div className="f6-item-head">
              <Cpu className="f6-icon" />
              <h3>Powerful</h3>
            </div>
            <p>It supports an entire ecosystem helping developers and businesses scale confidently.</p>
          </article>

          <article className="f6-item">
            <div className="f6-item-head">
              <Lock className="f6-icon" />
              <h3>Security</h3>
            </div>
            <p>It supports secure collaboration while helping developers and businesses innovate.</p>
          </article>

          <article className="f6-item">
            <div className="f6-item-head">
              <Sparkles className="f6-icon" />
              <h3>AI Powered</h3>
            </div>
            <p>It supports AI-driven workflows that help teams build, test, and ship with confidence.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
