import React from 'react';
import { getAuthInfo } from '@/external/deriv-core';
import './free-bots.scss';
import './free-bots-access.scss';

type FreeBot = {
    id: string;
    name: string;
    description: string;
    market: string;
    type: string;
    status: 'ready' | 'coming-soon';
    version: string;
};

// Add future tested free bots here. Keep the id unique.
// Ready bots are distributed as .sbfbot packages so they can be imported by SBF rather than exposed as raw credentials.
export const FREE_BOTS: FreeBot[] = [
    {
        id: 'digit-pulse',
        name: 'Digit Pulse AI',
        description: 'A digit-analysis bot powered by the SilverBullet statistical engine. Trading execution remains under the user\'s control.',
        market: 'Deriv Synthetic Indices',
        type: 'Digits',
        status: 'coming-soon',
        version: '1.0.0',
    },
    {
        id: 'volatility-trend',
        name: 'Volatility Trend Bot',
        description: 'A trend-following strategy package for selected Deriv Volatility Indices.',
        market: 'Volatility Indices',
        type: 'Trend',
        status: 'coming-soon',
        version: '1.0.0',
    },
    {
        id: 'sbf-scalper',
        name: 'SBF Strategy Bot',
        description: 'Reserved for a tested SilverBullet strategy. It will be released only after validation inside SBF.',
        market: 'Deriv',
        type: 'Strategy',
        status: 'coming-soon',
        version: '1.0.0',
    },
];

const downloadSbfBot = (bot: FreeBot) => {
    const packageData = {
        format: 'SBF_BOT_PACKAGE',
        format_version: 1,
        license: 'SBF_PLATFORM_ONLY',
        bot_id: bot.id,
        name: bot.name,
        version: bot.version,
        market: bot.market,
        type: bot.type,
        description: bot.description,
        exported_at: new Date().toISOString(),
        note: 'Import this .sbfbot package into SilverBulletFX. It is not a Deriv credential or API token.',
    };

    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${bot.id}.sbfbot`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

const useBotInSbf = (bot: FreeBot) => {
    if (!getAuthInfo()) return;
    localStorage.setItem('sbf_pending_free_bot', bot.id);
    window.location.hash = 'bot_builder';
};

const FreeBots = () => (
    <section className='free-bots-section'>
        <div className='free-bots-heading'>
            <div>
                <div className='free-bots-kicker'>SILVERBULLETFX</div>
                <h2>Free Bots</h2>
                <p>Free SBF strategies are available inside the authenticated workspace. Ready bots can be opened in SBF or downloaded as SBF bot packages.</p>
            </div>
            <span className='free-bots-badge'>FREE</span>
        </div>

        <div className='free-bots-grid'>
            {FREE_BOTS.map(bot => (
                <article className='free-bot-card' key={bot.id}>
                    <div className='free-bot-icon'>✦</div>
                    <div className='free-bot-content'>
                        <div className='free-bot-topline'><h3>{bot.name}</h3><span className={bot.status === 'ready' ? 'ready' : 'coming'}>{bot.status === 'ready' ? 'READY' : 'COMING SOON'}</span></div>
                        <p>{bot.description}</p>
                        <div className='free-bot-meta'><span>{bot.market}</span><span>{bot.type}</span><span>v{bot.version}</span></div>
                        <div className='free-bot-actions'>
                            <button type='button' disabled={bot.status !== 'ready'} onClick={() => useBotInSbf(bot)}>{bot.status === 'ready' ? 'USE IN SBF' : 'COMING SOON'}</button>
                            <button type='button' className='download' disabled={bot.status !== 'ready'} onClick={() => downloadSbfBot(bot)}>{bot.status === 'ready' ? 'DOWNLOAD' : 'LOCKED'}</button>
                        </div>
                    </div>
                </article>
            ))}
        </div>

        <div className='sbf-bot-license-note'><strong>SBF BOT FORMAT</strong><span>Downloaded free bots use the <code>.sbfbot</code> package format. The package contains strategy metadata, not your Deriv password, token or account credentials.</span></div>
    </section>
);

export default FreeBots;
