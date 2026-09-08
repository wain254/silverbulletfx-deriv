import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.scss';

const features = [
    {
        icon: '✦',
        title: 'AI Digit Intelligence',
        text: 'Read live digit behaviour, distributions, streaks and confirmation signals before you act.',
    },
    {
        icon: '▦',
        title: 'Visual Bot Builder',
        text: 'Build Deriv strategies visually with a familiar block-based workflow and no-code logic.',
    },
    {
        icon: '◉',
        title: 'Live Market Data',
        text: 'Connect to public Deriv market data and keep your analysis grounded in live ticks.',
    },
    {
        icon: '⌁',
        title: 'Free Bot Lab',
        text: 'Keep your tested SilverBullet strategies in one workspace and expand the library over time.',
    },
];

const stats = [
    ['10', 'Digit outcomes'],
    ['500+', 'Ticks per analysis'],
    ['24/7', 'Market monitoring'],
    ['1', 'Unified workspace'],
];

const LandingPage = () => {
    const navigate = useNavigate();
    const [video_failed, setVideoFailed] = useState(false);

    useEffect(() => {
        const legacyTab = window.location.hash.replace('#', '');
        if (legacyTab === 'dashboard' || legacyTab === 'bot_builder' || legacyTab === 'chart') {
            navigate(`/app#${legacyTab}`, { replace: true });
        }
    }, [navigate]);

    const openApp = (tab = 'dashboard') => {
        navigate(`/app#${tab}`);
    };

    return (
        <main className='sbf-landing'>
            <div className='sbf-grid' />
            <div className='sbf-glow sbf-glow--one' />
            <div className='sbf-glow sbf-glow--two' />

            <header className='sbf-nav'>
                <button className='sbf-brand' onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <span className='sbf-brand-mark'>SBF</span>
                    <span>
                        <strong>SilverBullet</strong>
                        <em>FX</em>
                    </span>
                </button>
                <nav>
                    <a href='#features'>Features</a>
                    <a href='#preview'>Platform</a>
                    <a href='#why-sbf'>Why SBF</a>
                </nav>
                <button className='sbf-nav-cta' onClick={() => openApp()}>
                    Open Platform <span>↗</span>
                </button>
            </header>

            <section className='sbf-hero'>
                <div className='sbf-hero-copy'>
                    <div className='sbf-eyebrow'><span /> BUILT FOR DERIV TRADERS</div>
                    <h1>
                        Build smarter.
                        <br />
                        <span>Analyze faster.</span>
                        <br />
                        Trade with a plan.
                    </h1>
                    <p>
                        SilverBulletFX is a focused trading workspace combining a visual bot builder,
                        live Deriv market data and an AI-powered digit analysis engine.
                    </p>
                    <div className='sbf-hero-actions'>
                        <button className='sbf-primary' onClick={() => openApp('dashboard')}>
                            Launch SBF <span>→</span>
                        </button>
                        <button className='sbf-secondary' onClick={() => openApp('bot_builder')}>
                            Build a Bot <span>⌘</span>
                        </button>
                    </div>
                    <div className='sbf-trust-row'>
                        <span>● Live data ready</span>
                        <span>● No-code builder</span>
                        <span>● AI analysis</span>
                    </div>
                </div>

                <div className='sbf-hero-visual' aria-label='SilverBulletFX platform preview'>
                    <div className='sbf-window'>
                        <div className='sbf-window-bar'>
                            <div className='sbf-window-dots'><i /><i /><i /></div>
                            <div className='sbf-window-url'>silverbulletfx.app / intelligence</div>
                            <div className='sbf-live-pill'><span /> LIVE</div>
                        </div>
                        <div className='sbf-window-body'>
                            <aside>
                                <div className='mini-logo'>SBF</div>
                                <span className='active'>◈</span><span>▦</span><span>◌</span><span>⚙</span>
                            </aside>
                            <div className='sbf-mini-dashboard'>
                                <div className='mini-heading'>
                                    <div><small>AI MARKET INTELLIGENCE</small><strong>Digit Pulse</strong></div>
                                    <b>CONNECTED</b>
                                </div>
                                <div className='mini-cards'>
                                    <div><small>MARKET</small><strong>Volatility 75</strong><span>◉ LIVE TICKS</span></div>
                                    <div><small>LAST DIGIT</small><strong>7</strong><span className='positive'>HOT</span></div>
                                    <div><small>CONFIDENCE</small><strong>82%</strong><span>6 confirmations</span></div>
                                </div>
                                <div className='mini-chart'>
                                    <div className='chart-line chart-line-one' />
                                    <div className='chart-line chart-line-two' />
                                    <div className='chart-dots'><i /><i /><i /><i /><i /><i /><i /></div>
                                </div>
                                <div className='mini-bottom'>
                                    <div><span>STATISTICAL BIAS</span><strong>OVER 4</strong></div>
                                    <div><span>ENGINE STATUS</span><strong className='green'>WATCH</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='sbf-float-card'>
                        <span>AI SIGNAL</span>
                        <strong>WAIT → CONFIRM</strong>
                        <small>Not a guarantee · use risk controls</small>
                    </div>
                </div>
            </section>

            <section className='sbf-stats'>
                {stats.map(([value, label]) => (
                    <div key={label}><strong>{value}</strong><span>{label}</span></div>
                ))}
            </section>

            <section id='features' className='sbf-section'>
                <div className='sbf-section-heading'>
                    <div className='sbf-eyebrow'><span /> THE SBF EDGE</div>
                    <h2>One workspace. <span>More control.</span></h2>
                    <p>Designed around the tools traders actually need — without pretending that any signal is guaranteed.</p>
                </div>
                <div className='sbf-feature-grid'>
                    {features.map(feature => (
                        <article key={feature.title} className='sbf-feature-card'>
                            <div className='feature-icon'>{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                            <span className='feature-arrow'>Explore →</span>
                        </article>
                    ))}
                </div>
            </section>

            <section id='preview' className='sbf-demo-section'>
                <div className='sbf-demo-copy'>
                    <div className='sbf-eyebrow'><span /> PLATFORM WALKTHROUGH</div>
                    <h2>See the workspace <span>in action.</span></h2>
                    <p>
                        The landing experience is intentionally built around the same dark, data-first feel as the
                        reference you shared, but uses an original SilverBulletFX visual system and your SBF identity.
                    </p>
                    <button className='sbf-primary' onClick={() => openApp('dashboard')}>Enter the workspace →</button>
                </div>
                <div className='sbf-video-shell'>
                    {!video_failed ? (
                        <video
                            controls
                            muted
                            playsInline
                            preload='metadata'
                            onError={() => setVideoFailed(true)}
                            poster='/logo.jpg'
                        >
                            <source src='/assets/sbf-demo.mp4' type='video/mp4' />
                        </video>
                    ) : (
                        <div className='sbf-video-fallback'>
                            <div className='fallback-play'>▶</div>
                            <strong>SBF Platform Preview</strong>
                            <span>Add <code>/public/assets/sbf-demo.mp4</code> to play your screen recording here.</span>
                        </div>
                    )}
                    <div className='video-caption'><span>●</span> SBF LIVE WORKSPACE PREVIEW</div>
                </div>
            </section>

            <section id='why-sbf' className='sbf-why'>
                <div className='sbf-why-panel'>
                    <div className='sbf-brand-lockup'><span className='sbf-brand-mark'>SBF</span><strong>SilverBullet<span>FX</span></strong></div>
                    <h2>Built to become your <span>trading command centre.</span></h2>
                    <p>
                        Start with analysis. Add tested bots. Keep execution under your control. SBF is being built as
                        a modular platform so new strategies, markets and AI tools can be added without rebuilding the whole app.
                    </p>
                    <div className='sbf-checks'>
                        <span>✓ Modular bot library</span>
                        <span>✓ Deriv-first workflow</span>
                        <span>✓ Risk-aware AI language</span>
                        <span>✓ Designed for desktop + mobile</span>
                    </div>
                    <button className='sbf-primary' onClick={() => openApp('bot_builder')}>Start Building →</button>
                </div>
            </section>

            <footer className='sbf-footer'>
                <div className='sbf-footer-brand'><span className='sbf-brand-mark'>SBF</span><strong>SilverBulletFX</strong></div>
                <span>© {new Date().getFullYear()} SilverBulletFX. Built for disciplined trading workflows.</span>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button>
            </footer>
        </main>
    );
};

export default LandingPage;
