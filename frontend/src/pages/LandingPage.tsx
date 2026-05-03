import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  CheckCircle,
  ChevronRight,
  Clock,
  Cpu,
  Github,
  Globe,
  Layers3,
  Linkedin,
  LineChart,
  Mail,
  Menu,
  MessageSquare,
  Minus,
  Plus,
  Play,
  Quote,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  Twitter,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Features } from '../components/ui/features-6';
import { Footer } from '../components/ui/modem-animated-footer';
import './LandingPage.css';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

const ScrollReveal = ({ children, delay = 0, direction = 'up', className = '' }: ScrollRevealProps) => {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <div className={`lp-relative lp-w-full ${className}`}>
      <motion.div
        initial={{ opacity: 0, ...directions[direction] }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const signUpUrl = 'http://localhost:5173/register';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnnualBilling, setIsAnnualBilling] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  const progressWidth = useTransform(smoothProgress, [0, 1], ['0%', '100%']);
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, 90]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const bgY1 = useTransform(smoothProgress, [0, 1], [0, 360]);
  const bgY2 = useTransform(smoothProgress, [0, 1], [0, -220]);
  const bgY3 = useTransform(smoothProgress, [0, 1], [0, 280]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('lp-lock-scroll', isMobileMenuOpen);

    return () => {
      document.body.classList.remove('lp-lock-scroll');
    };
  }, [isMobileMenuOpen]);

  const features = [
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Deep learning models that understand complex candidate skillsets beyond keywords.',
    },
    {
      icon: Clock,
      title: 'Instant Sourcing',
      description: 'Slash your time-to-hire by automating high-precision candidate sourcing.',
    },
    {
      icon: Target,
      title: 'Cultural Fit',
      description: 'Predict company-candidate alignment using behavioral signals and AI profiling.',
    },
    {
      icon: MessageSquare,
      title: 'Engagement',
      description: 'Automated candidate nurturing that keeps top talent engaged throughout the flow.',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Recruitment dashboards with pipeline visibility and predictive hiring insights.',
    },
    {
      icon: Shield,
      title: 'Fair Hiring',
      description: 'Built-in bias detection helps teams run a more equitable recruiting process.',
    },
  ];

  const integrations = [
    'LinkedIn',
    'Greenhouse',
    'Workday',
    'Ashby',
    'Slack',
    'Notion',
    'Google Workspace',
    'Zoom',
    'OpenAI',
    'Salesforce',
    'BambooHR',
    'Calendly',
  ];

  const testimonials = [
    {
      name: 'Ava Chen',
      role: 'VP of Talent, Northstar AI',
      quote: 'RECRUT cut our screening time from days to minutes while improving quality and candidate experience.',
    },
    {
      name: 'Marcus Patel',
      role: 'Founder, HelioCloud',
      quote: 'The automation is production-grade. It feels like we added a full recruiting team overnight.',
    },
    {
      name: 'Sofia Rivera',
      role: 'Head of People, LatticeRun',
      quote: 'We finally have a hiring system that is fast, measurable, and consistent across every role.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      priceMonthly: '$49',
      priceAnnual: '$39',
      description: 'For lean teams validating faster hiring workflows.',
      features: ['AI job intake', 'Basic resume ranking', '3 active roles', 'Email support'],
    },
    {
      name: 'Growth',
      priceMonthly: '$149',
      priceAnnual: '$119',
      description: 'The most popular plan for scaling hiring teams.',
      features: ['Everything in Starter', 'Interview automation', 'Analytics dashboard', 'Unlimited roles', 'Priority support'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      priceMonthly: 'Custom',
      priceAnnual: 'Custom',
      description: 'For orgs that need governance, security, and custom integrations.',
      features: ['Custom workflows', 'SSO and RBAC', 'Dedicated success manager', 'Private deployment', 'Security review'],
    },
  ];

  const faqs = [
    {
      question: 'How quickly can we go live?',
      answer: 'Most teams can launch within a day using the default workflow and then customize hiring stages as needed.',
    },
    {
      question: 'Can RECRUT work with our ATS?',
      answer: 'Yes. We support common ATS, calendar, and messaging integrations, with custom API connections for enterprise customers.',
    },
    {
      question: 'Is candidate data secure?',
      answer: 'The product is designed around encryption, auditability, and permissioned access so hiring teams can operate safely.',
    },
    {
      question: 'Does it support collaborative hiring?',
      answer: 'Yes. Interviewers, recruiters, and hiring managers can review candidates, share feedback, and coordinate in one place.',
    },
  ];

  const heroHighlights = [
    { icon: Users, label: '500+ teams onboarded' },
    { icon: BadgeCheck, label: 'SOC2-ready workflows' },
    { icon: Globe, label: 'Global candidate reach' },
  ];

  const stats = [
    { value: '85%', label: 'Faster Hiring' },
    { value: '3.2x', label: 'Talent Quality' },
    { value: '92%', label: 'Retention' },
    { value: '60%', label: 'Cost Saving' },
  ];

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Demo', href: '#demo' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div ref={containerRef} className="lp-wrapper">
      <motion.div className="lp-progress-bar" style={{ width: progressWidth }} />
      <div className="lp-noise-overlay" />

      <div className="lp-bg-parallax">
        <motion.div style={{ y: bgY1 }} className="lp-orb lp-orb-1" />
        <motion.div style={{ y: bgY2 }} className="lp-orb lp-orb-2" />
        <motion.div style={{ y: bgY3 }} className="lp-orb lp-orb-3" />
        <motion.div
          animate={reduceMotion ? undefined : { rotate: 360, x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          className="lp-absolute lp-float-shape lp-float-shape-1"
        />
        <motion.div
          animate={reduceMotion ? undefined : { rotate: -360, x: [0, -20, 0], y: [0, 22, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          className="lp-absolute lp-float-shape lp-float-shape-2"
        />
      </div>

      <header className={`lp-nav-shell ${isScrolled ? 'scrolled' : ''}`}>
        <div className="lp-container lp-flex lp-items-center lp-justify-between lp-py-nav">
          <a href="#top" className="lp-brand" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="lp-brand-mark"><Brain size={18} /></span>
            <span className="lp-nav-logo-text">RECRUT</span>
          </a>

          <nav className="lp-nav-links lp-desktop-nav" aria-label="Primary">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="lp-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="lp-flex lp-items-center lp-gap-4 lp-desktop-actions">
            <a className="lp-nav-link lp-login-link" href={signUpUrl}>Login</a>
            <a className="lp-btn lp-btn-primary lp-btn-sm" href={signUpUrl}>Get Started</a>
          </div>

          <button className="lp-mobile-menu-button" onClick={() => setIsMobileMenuOpen((current) => !current)} aria-label="Toggle navigation">
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="lp-mobile-nav"
            >
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="lp-mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              <div className="lp-mobile-nav-actions">
                <a className="lp-btn lp-btn-secondary lp-w-full" href={signUpUrl}>Login</a>
                <a className="lp-btn lp-btn-primary lp-w-full" href={signUpUrl}>Get Started</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="top" className="lp-relative lp-z-10">
        <section className="lp-relative lp-min-h-screen lp-flex lp-flex-col lp-items-center lp-justify-center lp-pt-hero lp-hero-section">
          <motion.div className="lp-container lp-text-center" style={{ y: heroY, opacity: heroOpacity }}>
            <ScrollReveal>
              <div className="lp-hero-badge">
                <Sparkles size={16} />
                <span>AI-Powered Talent Acquisition</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h1 className="lp-h1">
                The Future of Hiring is
                <span className="lp-text-gradient-animated lp-h1-accent">Intelligent.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="lp-p-hero lp-mb-12">
                Automate sourcing, screening, and engagement with a polished AI hiring platform built for modern SaaS teams.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="lp-flex lp-justify-center lp-gap-6 lp-hero-actions">
                <a className="lp-btn lp-btn-primary" href={signUpUrl}>
                  Start Hiring Now
                  <ArrowRight size={20} />
                </a>
                <a className="lp-btn lp-btn-secondary" href="#demo">
                  Watch the Demo
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="lp-hero-trust-row">
                {heroHighlights.map(({ icon: Icon, label }) => (
                  <div key={label} className="lp-flex lp-items-center lp-gap-2">
                    <Icon size={14} color="#818cf8" />
                    {label}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </motion.div>

          <ScrollReveal delay={0.2} className="lp-hero-preview-wrap">
            <div className="lp-hero-preview lp-glass-panel">
              <div className="lp-hero-preview-topbar">
                <div className="lp-preview-dots"><span /><span /><span /></div>
                <span className="lp-preview-label">Live hiring cockpit</span>
              </div>
              <div className="lp-hero-preview-grid">
                <div className="lp-preview-card lp-preview-card-accent">
                  <span className="lp-preview-card-label">Qualified candidates</span>
                  <strong>128</strong>
                  <span>+24% this week</span>
                </div>
                <div className="lp-preview-card">
                  <span className="lp-preview-card-label">Screening automation</span>
                  <strong>94%</strong>
                  <span>less manual work</span>
                </div>
                <div className="lp-preview-video">
                  <button className="lp-preview-play" aria-label="Play demo preview">
                    <Play size={20} />
                  </button>
                  <div>
                    <span className="lp-preview-card-label">Demo preview</span>
                    <strong>See RECRUT in action</strong>
                    <p>Candidate matching, interview orchestration, and analytics in one system.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="lp-py-section" id="features">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">Product capabilities</div>
              <h2 className="lp-h2">Supercharge your workflow</h2>
              <p className="lp-p-hero">Everything you need to find, attract, and hire the best talent globally.</p>
            </ScrollReveal>

            <div className="lp-grid lp-grid-cols-3 lp-gap-8">
              {features.map((feature, index) => {
                const FeatureIcon = feature.icon;

                return (
                  <ScrollReveal key={feature.title} delay={index * 0.08}>
                    <div className="lp-glass-panel lp-feature-card">
                      <div className="lp-card-icon">
                        <FeatureIcon size={28} />
                      </div>
                      <h3 className="lp-h3 lp-mb-4">{feature.title}</h3>
                      <p className="lp-p-large">{feature.description}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <Features />

        <section className="lp-py-section lp-relative lp-overflow-hidden">
          <div className="lp-container">
            <div className="lp-grid lp-grid-cols-4 lp-gap-12">
              {stats.map((stat, index) => (
                <ScrollReveal key={stat.label} delay={index * 0.08}>
                  <div className="lp-text-center">
                    <div className="lp-text-gradient-static lp-stat-value">{stat.value}</div>
                    <div className="lp-stat-label">{stat.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-py-section" id="demo">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">Demo tour</div>
              <h2 className="lp-h2">A product story that feels real</h2>
              <p className="lp-p-hero">Show the value before the first sales call with a polished experience that explains itself instantly.</p>
            </ScrollReveal>

            <div className="lp-demo-grid">
              <ScrollReveal direction="left">
                <div className="lp-demo-panel lp-glass-panel">
                  <div className="lp-demo-header">
                    <Video size={18} />
                    <span>45-second product walkthrough</span>
                  </div>
                  <div className="lp-demo-video-frame">
                    <button className="lp-demo-play" aria-label="Play product demo">
                      <Play size={24} />
                    </button>
                    <div className="lp-demo-video-copy">
                      <strong>Automate sourcing, screening, and interviewing</strong>
                      <p>RECRUT helps teams move from intake to shortlist with less manual effort and better signal.</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.1}>
                <div className="lp-demo-side">
                  {[
                    { icon: Cpu, title: 'AI Matching', text: 'Rank candidates by skill, experience, and role fit.' },
                    { icon: LineChart, title: 'Hiring Analytics', text: 'Track pipeline health and conversion in one dashboard.' },
                    { icon: Rocket, title: 'Fast setup', text: 'Launch your hiring workflow without a long implementation.' },
                  ].map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <div key={item.title} className="lp-demo-stat lp-glass-panel">
                        <ItemIcon size={20} />
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="lp-py-section" id="integrations">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">Integrations</div>
              <h2 className="lp-h2">Works with the tools your team already uses</h2>
              <p className="lp-p-hero">Connect your ATS, collaboration tools, and calendar stack in minutes.</p>
            </ScrollReveal>

            <div className="lp-integration-grid">
              {integrations.map((integration, index) => (
                <ScrollReveal key={integration} delay={index * 0.04}>
                  <div className="lp-integration-chip">
                    <Layers3 size={16} />
                    <span>{integration}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-py-section">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">Social proof</div>
              <h2 className="lp-h2">Teams ship hiring faster with less friction</h2>
              <p className="lp-p-hero">A clear product story is reinforced with real-looking outcomes, credibility, and confidence.</p>
            </ScrollReveal>

            <div className="lp-grid lp-grid-cols-3 lp-gap-8">
              {testimonials.map((testimonial, index) => (
                <ScrollReveal key={testimonial.name} delay={index * 0.08}>
                  <div className="lp-testimonial-card lp-glass-panel">
                    <Quote size={18} className="lp-quote-icon" />
                    <div className="lp-testimonial-stars">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} size={14} fill="currentColor" />
                      ))}
                    </div>
                    <p className="lp-p-large">{testimonial.quote}</p>
                    <div className="lp-testimonial-meta">
                      <div className="lp-avatar">{testimonial.name.split(' ').map((part) => part[0]).join('')}</div>
                      <div>
                        <h3>{testimonial.name}</h3>
                        <span>{testimonial.role}</span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-py-section" id="pricing">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">Pricing</div>
              <h2 className="lp-h2">Choose the plan that matches your hiring motion</h2>
              <p className="lp-p-hero">Monthly or annual billing with a clear upgrade path from startup to enterprise.</p>
            </ScrollReveal>

            <div className="lp-billing-toggle-wrap">
              <button className={`lp-billing-toggle ${!isAnnualBilling ? 'is-active' : ''}`} onClick={() => setIsAnnualBilling(false)}>
                Monthly
              </button>
              <button className={`lp-billing-toggle ${isAnnualBilling ? 'is-active' : ''}`} onClick={() => setIsAnnualBilling(true)}>
                Annual <span>Save 20%</span>
              </button>
            </div>

            <div className="lp-grid lp-grid-cols-3 lp-gap-8">
              {pricingPlans.map((plan, index) => (
                <ScrollReveal key={plan.name} delay={index * 0.08}>
                  <div className={`lp-pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                    <div className="lp-pricing-top">
                      <h3 className="lp-h3">{plan.name}</h3>
                      {plan.highlighted && <span className="lp-plan-badge">Most popular</span>}
                    </div>
                    <p className="lp-pricing-description">{plan.description}</p>
                    <div className="lp-pricing-price">
                      <span>{isAnnualBilling ? plan.priceAnnual : plan.priceMonthly}</span>
                      {plan.priceMonthly !== 'Custom' && <small>/month</small>}
                    </div>
                    <ul className="lp-feature-list">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <CheckCircle size={16} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <a className={`lp-btn ${plan.highlighted ? 'lp-btn-primary' : 'lp-btn-secondary'} lp-w-full`} href={signUpUrl}>
                      {plan.priceMonthly === 'Custom' ? 'Contact Sales' : 'Start Free'}
                    </a>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-py-section" id="faq">
          <div className="lp-container">
            <ScrollReveal className="lp-text-center lp-mb-20">
              <div className="lp-section-kicker">FAQ</div>
              <h2 className="lp-h2">Frequently asked questions</h2>
              <p className="lp-p-hero">Answer the buying questions that usually block conversion.</p>
            </ScrollReveal>

            <div className="lp-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <ScrollReveal key={faq.question} delay={index * 0.06}>
                    <button className={`lp-faq-item ${isOpen ? 'is-open' : ''}`} onClick={() => setOpenFaq(isOpen ? -1 : index)}>
                      <div className="lp-faq-question">
                        <h3>{faq.question}</h3>
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="lp-faq-answer-wrap"
                          >
                            <p>{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-py-section">
          <div className="lp-container">
            <ScrollReveal>
              <div className="lp-cta-panel lp-glass-panel lp-flex lp-items-center lp-justify-between">
                <div className="lp-cta-copy">
                  <div className="lp-section-kicker">Ready to launch</div>
                  <h2 className="lp-h2" style={{ marginBottom: '1rem' }}>Ready to scale?</h2>
                  <p className="lp-p-large">Join the recruitment revolution and build your dream team with AI.</p>
                </div>
                <a className="lp-btn lp-btn-primary" href={signUpUrl}>
                  Get Started Free
                  <ChevronRight size={20} />
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer
        brandName="RECRUT"
        brandDescription="Next-generation AI recruitment platform for modern teams."
        socialLinks={[
          { icon: <Twitter className="w-6 h-6" />, href: 'https://twitter.com', label: 'Twitter' },
          { icon: <Linkedin className="w-6 h-6" />, href: 'https://linkedin.com', label: 'LinkedIn' },
          { icon: <Github className="w-6 h-6" />, href: 'https://github.com', label: 'GitHub' },
          { icon: <Mail className="w-6 h-6" />, href: 'mailto:contact@recrut.ai', label: 'Email' },
        ]}
        navLinks={[
          { label: 'Product', href: '#' },
          { label: 'Company', href: '#' },
          { label: 'Resources', href: '#' },
          { label: 'Legal', href: '#' },
        ]}
        creatorName="RECRUT Team"
        creatorUrl="https://recrut.ai"
        brandIcon={<Brain className="footer-logo-icon footer-logo-icon-small" />}
      />
    </div>
  );
};

export default LandingPage;