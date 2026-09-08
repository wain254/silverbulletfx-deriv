import React from 'react';
import './free-bots.scss';

type FreeBot = {
    id: string;
    name: string;
    description: string;
    market: string;
    type: string;
    status: 'ready' | 'coming-soon';
};

// Add future free bots here. Keep the id unique.
export const FREE_BOTS: FreeBot[] = [
    {
        id: 'digit-pulse',
        name: 'Digit Pulse AI',
        description: 'A future digit-analysis bot powered by the SilverBullet statistical engine.',
        market: 'Deriv Synthetic Indices',
        type: 'Digits',
        status: 'coming-soon',
    },
    {
        id: 'volatility-trend',
        name: 'Volatility Trend Bot',
        description: 'A future trend-following bot for selected Deriv Volatility Indices.',
        market: 'Volatility Indices',
        type: 'Trend',
        status: 'coming-soon',
    },
    {
        id: 'sbf-scalper',
        name: 'SBF Strategy Bot',
        description: 'Reserved for one of your own tested SilverBullet strategies.',
        market: 'Deriv',
        type: 'Strategy',
        status: 'coming-soon',
    },
];

const FreeBots = () => (
    <section className='free-bots-section'>
        <div className='free-bots-heading'>
            <div>
                <div className='free-bots-kicker'>SILVERBULLETFX</div>
                <h2>Free Bots</h2>
                <p>Free strategies you can add to the Bot Builder and test before using them live.</p>
            </div>
            <span className='free-bots-badge'>FREE</span>
        </div>

        <div className='free-bots-grid'>
            {FREE_BOTS.map(bot => (
                <article className='free-bot-card' key={bot.id}>
                    <div className='free-bot-icon'>✦</div>
                    <div className='free-bot-content'>
                        <div className='free-bot-topline'>
                            <h3>{bot.name}</h3>
                            <span className={bot.status === 'ready' ? 'ready' : 'coming'}>
                                {bot.status === 'ready' ? 'READY' : 'COMING SOON'}
                            </span>
                        </div>
                        <p>{bot.description}</p>
                        <div className='free-bot-meta'>
                            <span>{bot.market}</span>
                            <span>{bot.type}</span>
                        </div>
                        <button type='button' disabled={bot.status !== 'ready'}>
                            {bot.status === 'ready' ? 'OPEN BOT' : 'ADD LATER'}
                        </button>
                    </div>
                </article>
            ))}
        </div>
    </section>
);

export default FreeBots;
