import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthInfo, initiateLogin, initiateSignUp } from '@/external/deriv-core';
import './landing.scss';
import './landing-auth.scss';

const features = [
    { icon: '✦', title: 'AI Digit Intelligence', text: 'Read live digit behaviour, distributions, streaks and confirmation signals from the Deriv feed before you act.' },
    { icon: '▦', title: 'Visual Bot Builder', text: 'Build Deriv strategies visually with a familiar block-based workflow and no-code logic.' },
    { icon: '◉', title: 'Live Deriv Market Data', text: 'Connect analysis directly to Deriv public market data and live tick streams.' },
    { icon: '⌁', title: 'Free Bot Lab', text: 'Use SBF free bots inside your SBF workspace and download SBF bot packages for later use.' },
];

const stats = [
    ['10', 'Digit outcomes'],
    ['500+', 'Ticks per analysis'],
    ['24/7', 'Market monitoring'],
    ['1', 'Unified workspace'],
];

const authConfig = () => {
    const referral = process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK || '';
    let affiliateToken: string | undefined;
    let utmSource: string | undefined;
    let utmMedium: string | undefined;
    let utmCampaign: string | undefined;
    try {
        const url = new URL(referral);
        affiliateToken = url.searchParams.get('t') || undefined;
        utmSource = url.searchParams.get('utm_source') || undefined;
        utmMedium = url.searchParams.get('utm_medium') || undefined;
        utmCampaign = url.searchParams.get('utm_campaign') || undefined;
    } catch {
        // Referral attribution is optional; authentication still works without it.
    }
    return {
        clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID || '',
        redirectUri: window.location.origin,
        scopes: 'trade',
        affiliateToken,
        affiliateTokenParam: 't' as const,
        utmSource,
        utmMedium,
        utmCampaign,
    };
};

const LandingPage = () => {
    const navigate = useNavigate();
    const [video_failed, setVideoFailed] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);

    useEffect(() => {
        setIsAuthenticated(Boolean(getAuthInfo()));
        const legacyTab = window.location.hash.replace('#', '');
        if (legacyTab === 'dashboard' || legacyTab === 'bot_builder' || legacyTab === 'chart') {
            navigate(`/app#${legacyTab}`, { replace: true });
        }
    }, [navigate]);

    const config = useMemo(() => authConfig(), []);

    const openApp = (tab = 'dashboard') => {
        if (getAuthInfo()) {
            navigate(`/app#${tab}`);
            return;
        }
        setShowAuth(true);
    };

    const login = async () => {
        setAuthBusy(true);
        try {
            await initiateLogin(config);
        } finally {
            setAuthBusy(false);
        }
    };

    const signUp = async () => {
        setAuthBusy(true);
        try {
            await initiateSignUp(config);
        } finally {
            setAuthBusy(false);
        }
    };

    return (
        <main className='sbf-landing'>
            <div className='sbf-grid' />
            <div className='sbf-glow sbf-glow--one' />
            <div className='sbf-glow sbf-glow--two' />

            <header className='sbf-nav'>
                <button className='sbf-brand' onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <span className='sbf-brand-mark'>SBF</span>
                    <span><strong>SilverBullet</strong><em>FX</em></span>
                </button>
                <nav>
                    <a href='#features'>Features</a>
                    <a href='#preview'>Platform</a>
                    <a href='#free-access'>Free Bots</a>
                    <a href='#why-sbf'>Why SBF</a>
                </nav>
                <button className='sbf-nav-cta' onClick={() => openApp()}>
                    {isAuthenticated ? 'Open Platform' : 'Login with Deriv'} <span>↗</span>
                </button>
            </header>

            <section className='sbf-hero'>
                <div className='sbf-hero-copy'>
                    <div className='sbf-eyebrow'><span /> BUILT FOR DERIV TRADERS</div>
                    <h1>Build smarter.<br /><span>Analyze faster.</span><br />Trade with a plan.</h1>
                    <p>SilverBulletFX is a focused trading workspace combining a visual bot builder, live Deriv market data and an AI-powered digit analysis engine.</p>
                    <div className='sbf-hero-actions'>
                        <button className='sbf-primary' onClick={() => openApp('dashboard')}>
                            {isAuthenticated ? 'Launch SBF' : 'Login to Launch'} <span>→</span>
                        </button>
                        <button className='sbf-secondary' onClick={() => openApp('bot_builder')}>Build a Bot <span>⌘</span></button>
                    </div>
                    <div className='sbf-trust-row'><span>● Deriv authentication</span><span>● Live market feed</span><span>● AI analysis</span></div>
                </div>

                <div className='sbf-hero-visual' aria-label='SilverBulletFX platform preview'>
                    <div className='sbf-window'>
                        <div className='sbf-window-bar'><div className='sbf-window-dots'><i /><i /><i /></div><div className='sbf-window-url'>silverbulletfx.app / intelligence</div><div className='sbf-live-pill'><span /> LIVE</div></div>
                        <div className='sbf-window-body'>
                            <aside><div className='mini-logo'>SBF</div><span className='active'>◈</span><span>▦</span><span>◌</span><span>⚙</span></aside>
                            <div className='sbf-mini-dashboard'>
                                <div className='mini-heading'><div><small>AI MARKET INTELLIGENCE</small><strong>Digit Pulse</strong></div><b>DERIV FEED</b></div>
                                <div className='mini-cards'><div><small>MARKET</small><strong>Volatility 75</strong><span>◉ LIVE TICKS</span></div><div><small>LAST DIGIT</small><strong>7</strong><span className='positive'>HOT</span></div><div><small>CONFIDENCE</small><strong>82%</strong><span>6 confirmations</span></div></div>
                                <div className='mini-chart'><div className='chart-line chart-line-one' /><div className='chart-line chart-line-two' /><div className='chart-dots'><i /><i /><i /><i /><i /><i /><i /></div></div>
                                <div className='mini-bottom'><div><span>STATISTICAL BIAS</span><strong>OVER 4</strong></div><div><span>ENGINE STATUS</span><strong className='green'>WATCH</strong></div></div>
                            </div>
                        </div>
                    </div>
                    <div className='sbf-float-card'><span>AI SIGNAL</span><strong>WAIT → CONFIRM</strong><small>Not a guarantee · use risk controls</small></div>
                </div>
            </section>

            <section className='sbf-stats'>{stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

            <section id='features' className='sbf-section'>
                <div className='sbf-section-heading'><div className='sbf-eyebrow'><span /> THE SBF EDGE</div><h2>One workspace. <span>More control.</span></h2><p>Designed around the tools traders actually need — with Deriv authentication and live market connectivity at the centre.</p></div>
                <div className='sbf-feature-grid'>{features.map(feature => <article key={feature.title} className='sbf-feature-card'><div className='feature-icon'>{feature.icon}</div><h3>{feature.title}</h3><p>{feature.text}</p><span className='feature-arrow'>Explore →</span></article>)}</div>
            </section>

            <section id='preview' className='sbf-demo-section'>
                <div className='sbf-demo-copy'><div className='sbf-eyebrow'><span /> PLATFORM WALKTHROUGH</div><h2>See the workspace <span>in action.</span></h2><p>Sign in with Deriv to enter the real workspace, connect your account and use the SBF tools.</p><button className='sbf-primary' onClick={() => openApp('dashboard')}>{isAuthenticated ? 'Enter the workspace' : 'Login with Deriv'} →</button></div>
                <div className='sbf-video-shell'>
                    {!video_failed ? <video controls muted playsInline preload='metadata' onError={() => setVideoFailed(true)} poster='/logo.jpg'><source src='/assets/sbf-demo.mp4' type='video/mp4' /></video> : <div className='sbf-video-fallback'><div className='fallback-play'>▶</div><strong>SBF Platform Preview</strong><span>Add <code>/public/assets/sbf-demo.mp4</code> to play your screen recording here.</span></div>}
                    <div className='video-caption'><span>●</span> SBF LIVE WORKSPACE PREVIEW</div>
                </div>
            </section>

            <section id='free-access' className='sbf-access-section'>
                <div><div className='sbf-eyebrow'><span /> SBF FREE BOT LAB</div><h2>Free bots. <span>Inside your workspace.</span></h2><p>Free SBF bot packages are designed for the SBF platform. Users must sign in with Deriv before opening the Bot Lab, and SBF bot packages are distributed in the SBF format rather than as unrestricted third-party credentials.</p></div>
                <button className='sbf-primary' onClick={() => openApp('dashboard')}>{isAuthenticated ? 'Open Free Bot Lab' : 'Login to Use Free Bots'} →</button>
            </section>

            <section id='why-sbf' className='sbf-why'>
                <div className='sbf-why-panel'><div className='sbf-brand-lockup'><span className='sbf-brand-mark'>SBF</span><strong>SilverBullet<span>FX</span></strong></div><h2>Built to become your <span>trading command centre.</span></h2><p>Start with analysis. Add tested bots. Keep execution under your control. SBF is modular so new strategies, markets and AI tools can be added without rebuilding the whole platform.</p><div className='sbf-checks'><span>✓ Deriv account authentication</span><span>✓ Modular bot library</span><span>✓ Live market data</span><span>✓ Risk-aware AI language</span></div><button className='sbf-primary' onClick={() => openApp('bot_builder')}>{isAuthenticated ? 'Start Building' : 'Login & Start Building'} →</button></div>
            </section>

            <footer className='sbf-footer'><div className='sbf-footer-brand'><span className='sbf-brand-mark'>SBF</span><strong>SilverBulletFX</strong></div><span>© {new Date().getFullYear()} SilverBulletFX. Built for disciplined trading workflows.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></footer>

            {showAuth && (
                <div className='sbf-auth-backdrop' role='presentation' onMouseDown={event => { if (event.currentTarget === event.target) setShowAuth(false); }}>
                    <section className='sbf-auth-modal' role='dialog' aria-modal='true' aria-labelledby='sbf-auth-title'>
                        <button className='sbf-auth-close' aria-label='Close' onClick={() => setShowAuth(false)}>×</button>
                        <div className='sbf-auth-logo'>SBF</div>
                        <div className='sbf-eyebrow'><span /> SECURE ACCESS</div>
                        <h2 id='sbf-auth-title'>Connect your <span>Deriv account.</span></h2>
                        <p>Login with Deriv to use SBF AI, live market tools, Bot Builder and the Free Bot Lab. SBF never asks for your Deriv password directly.</p>
                        <button className='sbf-auth-login' onClick={login} disabled={authBusy}>{authBusy ? 'Redirecting…' : 'Login with Deriv →'}</button>
                        <button className='sbf-auth-signup' onClick={signUp} disabled={authBusy}>New to Deriv? Create an account</button>
                        <small>Authentication is handled by Deriv OAuth 2.0. Your credentials stay on Deriv.</small>
                    </section>
                </div>
            )}
        </main>
    );
};

export default LandingPage;
