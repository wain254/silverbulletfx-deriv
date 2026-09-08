import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ai-digit-analyser.scss';

type DigitContract = 'DIGITOVER' | 'DIGITUNDER' | 'DIGITEVEN' | 'DIGITODD' | 'DIGITMATCH' | 'DIGITDIFF';

type TickMessage = {
    tick?: {
        quote?: number;
        symbol?: string;
    };
};

const MARKETS = [
    { label: 'Volatility 10', symbol: 'R_10' },
    { label: 'Volatility 25', symbol: 'R_25' },
    { label: 'Volatility 50', symbol: 'R_50' },
    { label: 'Volatility 75', symbol: 'R_75' },
    { label: 'Volatility 100', symbol: 'R_100' },
    { label: 'Volatility 10 (1s)', symbol: '1HZ10V' },
    { label: 'Volatility 25 (1s)', symbol: '1HZ25V' },
    { label: 'Volatility 50 (1s)', symbol: '1HZ50V' },
    { label: 'Volatility 75 (1s)', symbol: '1HZ75V' },
    { label: 'Volatility 100 (1s)', symbol: '1HZ100V' },
];

const CONTRACTS: { id: DigitContract; label: string }[] = [
    { id: 'DIGITOVER', label: 'Over' },
    { id: 'DIGITUNDER', label: 'Under' },
    { id: 'DIGITEVEN', label: 'Even' },
    { id: 'DIGITODD', label: 'Odd' },
    { id: 'DIGITMATCH', label: 'Matches' },
    { id: 'DIGITDIFF', label: 'Differs' },
];

const getLastDigit = (quote: number) => {
    const normalized = Number(quote).toFixed(2);
    return Number(normalized.replace('.', '').slice(-1));
};

const getMode = (digits: number[]) => {
    const counts = Array.from({ length: 10 }, () => 0);
    digits.forEach(digit => counts[digit]++);
    const max = Math.max(...counts);
    return counts.findIndex(count => count === max);
};

const getStreak = (digits: number[]) => {
    if (!digits.length) return 0;
    const last = digits[digits.length - 1];
    let streak = 0;
    for (let i = digits.length - 1; i >= 0 && digits[i] === last; i--) streak++;
    return streak;
};

const getContractHint = (contract: DigitContract, digits: number[]) => {
    if (digits.length < 20) return { direction: 'Collecting data', score: 0, reason: 'Need at least 20 recent ticks.' };

    const last = digits[digits.length - 1];
    const recent = digits.slice(-50);
    const counts = Array.from({ length: 10 }, () => 0);
    recent.forEach(digit => counts[digit]++);

    const evenRate = recent.filter(digit => digit % 2 === 0).length / recent.length;
    const over4Rate = recent.filter(digit => digit > 4).length / recent.length;
    const mode = getMode(recent);
    const modeRate = counts[mode] / recent.length;
    const hot = counts.indexOf(Math.max(...counts));
    const cold = counts.indexOf(Math.min(...counts));

    let probability = 50;
    let reason = '';

    switch (contract) {
        case 'DIGITEVEN':
            probability = evenRate * 100;
            reason = `${Math.round(evenRate * 100)}% of the last ${recent.length} digits were even.`;
            break;
        case 'DIGITODD':
            probability = (1 - evenRate) * 100;
            reason = `${Math.round((1 - evenRate) * 100)}% of the last ${recent.length} digits were odd.`;
            break;
        case 'DIGITOVER':
            probability = over4Rate * 100;
            reason = `${Math.round(over4Rate * 100)}% of the last ${recent.length} digits were 5–9.`;
            break;
        case 'DIGITUNDER':
            probability = (1 - over4Rate) * 100;
            reason = `${Math.round((1 - over4Rate) * 100)}% of the last ${recent.length} digits were 0–4.`;
            break;
        case 'DIGITMATCH':
            probability = modeRate * 100;
            reason = `Digit ${mode} appeared most often in the current sample.`;
            break;
        case 'DIGITDIFF':
            probability = (1 - modeRate) * 100;
            reason = `The sample is currently diverse; digit ${mode} is the most frequent.`;
            break;
    }

    const edge = Math.abs(probability - 50);
    const confidence = Math.min(95, Math.round(45 + edge * 1.2));
    const direction = probability >= 50 ? 'Statistical bias' : 'No strong bias';

    return {
        direction,
        score: confidence,
        reason,
        last,
        hot,
        cold,
    };
};

export const AIDigitAnalyser = () => {
    const [open, setOpen] = useState(false);
    const [symbol, setSymbol] = useState('R_75');
    const [contract, setContract] = useState<DigitContract>('DIGITOVER');
    const [digits, setDigits] = useState<number[]>([]);
    const [connected, setConnected] = useState(false);
    const [lastQuote, setLastQuote] = useState<number | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!open) return;

        const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';
        const socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        socketRef.current = socket;
        setDigits([]);
        setConnected(false);

        socket.onopen = () => {
            setConnected(true);
            socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        };

        socket.onmessage = event => {
            try {
                const message = JSON.parse(event.data) as TickMessage;
                if (message.tick?.quote == null) return;
                const quote = Number(message.tick.quote);
                const digit = getLastDigit(quote);
                setLastQuote(quote);
                setDigits(current => [...current, digit].slice(-200));
            } catch {
                // Ignore malformed websocket messages.
            }
        };

        socket.onerror = () => setConnected(false);
        socket.onclose = () => setConnected(false);

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [open, symbol]);

    const analysis = useMemo(() => getContractHint(contract, digits), [contract, digits]);
    const counts = useMemo(() => {
        const values = Array.from({ length: 10 }, () => 0);
        digits.slice(-100).forEach(digit => values[digit]++);
        return values;
    }, [digits]);

    const selectedContract = CONTRACTS.find(item => item.id === contract)?.label;
    const sampleSize = Math.min(100, digits.length);

    return (
        <div className='ai-digit-analyser'>
            {open && (
                <div className='ai-digit-panel'>
                    <div className='ai-digit-header'>
                        <div>
                            <div className='ai-digit-kicker'>SILVERBULLET AI</div>
                            <h3>Digit Analyzer</h3>
                            <span>AI-assisted statistical analysis for digit contracts</span>
                        </div>
                        <button className='ai-digit-close' onClick={() => setOpen(false)} aria-label='Close AI analyzer'>×</button>
                    </div>

                    <div className='ai-digit-controls'>
                        <label>
                            Market
                            <select value={symbol} onChange={event => setSymbol(event.target.value)}>
                                {MARKETS.map(market => <option key={market.symbol} value={market.symbol}>{market.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Digit trade type
                            <select value={contract} onChange={event => setContract(event.target.value as DigitContract)}>
                                {CONTRACTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className='ai-digit-status'>
                        <span className={connected ? 'dot online' : 'dot'} />
                        {connected ? `Live ticks • ${sampleSize}/100 sample` : 'Connecting to live ticks…'}
                        {lastQuote !== null && <b>{lastQuote}</b>}
                    </div>

                    <div className='ai-digit-summary'>
                        <div><small>LAST DIGIT</small><strong>{digits.length ? digits[digits.length - 1] : '—'}</strong></div>
                        <div><small>HOT DIGIT</small><strong>{digits.length ? getMode(digits.slice(-100)) : '—'}</strong></div>
                        <div><small>STREAK</small><strong>{digits.length ? getStreak(digits) : '—'}</strong></div>
                        <div><small>SAMPLE</small><strong>{sampleSize}</strong></div>
                    </div>

                    <div className='ai-digit-card'>
                        <div className='ai-card-title'>AI ANALYSIS <span>{selectedContract}</span></div>
                        <div className='ai-score-row'>
                            <strong>{analysis.score}%</strong>
                            <span>{analysis.direction}</span>
                        </div>
                        <p>{analysis.reason}</p>
                        {analysis.score > 0 && analysis.score < 58 && <div className='ai-warning'>Low statistical separation — wait for more data instead of forcing a trade.</div>}
                    </div>

                    <div className='ai-digit-card'>
                        <div className='ai-card-title'>DIGIT DISTRIBUTION <span>LAST 100</span></div>
                        <div className='digit-grid'>
                            {counts.map((count, digit) => (
                                <div className='digit-item' key={digit}>
                                    <span>{digit}</span>
                                    <div className='digit-bar'><i style={{ width: `${sampleSize ? Math.min(100, count * 5) : 0}%` }} /></div>
                                    <b>{count}</b>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='ai-digit-footer'>
                        <span>Over/Under • Even/Odd • Matches/Differs</span>
                        <small>Statistics are not a guarantee of the next tick.</small>
                    </div>
                </div>
            )}

            <button className={`ai-digit-bubble ${open ? 'active' : ''}`} onClick={() => setOpen(value => !value)} aria-label='Open AI Digit Analyzer'>
                <span className='ai-orbit'>✦</span>
                <strong>AI</strong>
                <small>DIGITS</small>
            </button>
        </div>
    );
};

export default AIDigitAnalyser;
