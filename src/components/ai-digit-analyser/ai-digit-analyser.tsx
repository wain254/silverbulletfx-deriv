import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ai-digit-analyser.scss';

type DigitContract = 'DIGITOVER' | 'DIGITUNDER' | 'DIGITEVEN' | 'DIGITODD' | 'DIGITMATCH' | 'DIGITDIFF';
type WindowSize = 10 | 25 | 50 | 100 | 500;

type Tick = { quote?: number; symbol?: string; pip_size?: number };
type TickMessage = { msg_type?: string; history?: { prices?: number[]; pip_size?: number }; tick?: Tick; error?: { message?: string } };

const MARKETS = [
    { label: 'Volatility 10', symbol: 'R_10' }, { label: 'Volatility 25', symbol: 'R_25' },
    { label: 'Volatility 50', symbol: 'R_50' }, { label: 'Volatility 75', symbol: 'R_75' },
    { label: 'Volatility 100', symbol: 'R_100' }, { label: 'Volatility 10 (1s)', symbol: '1HZ10V' },
    { label: 'Volatility 25 (1s)', symbol: '1HZ25V' }, { label: 'Volatility 50 (1s)', symbol: '1HZ50V' },
    { label: 'Volatility 75 (1s)', symbol: '1HZ75V' }, { label: 'Volatility 100 (1s)', symbol: '1HZ100V' },
];
const CONTRACTS: { id: DigitContract; label: string }[] = [
    { id: 'DIGITOVER', label: 'Over' }, { id: 'DIGITUNDER', label: 'Under' },
    { id: 'DIGITEVEN', label: 'Even' }, { id: 'DIGITODD', label: 'Odd' },
    { id: 'DIGITMATCH', label: 'Matches' }, { id: 'DIGITDIFF', label: 'Differs' },
];
const WINDOWS: WindowSize[] = [10, 25, 50, 100, 500];

const getPrecision = (pipSize?: number) => pipSize ? Math.max(0, Math.round(-Math.log10(pipSize))) : 2;
const getLastDigit = (quote: number, pipSize = 0.01) => {
    const precision = getPrecision(pipSize);
    const text = quote.toFixed(precision).replace('.', '');
    return Number(text.slice(-1));
};
const countDigits = (digits: number[]) => {
    const counts = Array.from({ length: 10 }, () => 0);
    digits.forEach(d => counts[d]++);
    return counts;
};
const entropy = (digits: number[]) => {
    if (!digits.length) return 0;
    const counts = countDigits(digits);
    return counts.reduce((sum, c) => {
        if (!c) return sum;
        const p = c / digits.length;
        return sum - p * Math.log2(p);
    }, 0);
};
const getStreak = (digits: number[]) => {
    if (!digits.length) return 0;
    const last = digits[digits.length - 1]; let streak = 0;
    for (let i = digits.length - 1; i >= 0 && digits[i] === last; i--) streak++;
    return streak;
};
const transitionStrength = (digits: number[]) => {
    if (digits.length < 2) return 0;
    let repeats = 0;
    for (let i = 1; i < digits.length; i++) if (digits[i] === digits[i - 1]) repeats++;
    return repeats / (digits.length - 1);
};

const analyze = (contract: DigitContract, digits: number[]) => {
    if (digits.length < 25) return { action: 'COLLECTING', confidence: 0, probability: 50, reason: 'Building a larger sample from live ticks.', barrier: null as number | null, confirmations: 0 };
    const recent = digits.slice(-100);
    const short = digits.slice(-25);
    const counts = countDigits(recent);
    const shortCounts = countDigits(short);
    const even = recent.filter(d => d % 2 === 0).length / recent.length;
    const over = recent.filter(d => d >= 5).length / recent.length;
    const mode = counts.indexOf(Math.max(...counts));
    const modeRate = counts[mode] / recent.length;
    const shortMode = shortCounts.indexOf(Math.max(...shortCounts));
    const shortModeRate = shortCounts[shortMode] / short.length;
    const edge = Math.max(0, Math.abs((contract === 'DIGITEVEN' ? even : contract === 'DIGITODD' ? 1 - even : contract === 'DIGITOVER' ? over : contract === 'DIGITUNDER' ? 1 - over : contract === 'DIGITMATCH' ? modeRate : 1 - modeRate) - 0.5));
    let probability = 50;
    let barrier: number | null = null;
    let reason = '';
    switch (contract) {
        case 'DIGITEVEN': probability = even * 100; reason = `Even digits: ${Math.round(probability)}% over 100 ticks.`; break;
        case 'DIGITODD': probability = (1 - even) * 100; reason = `Odd digits: ${Math.round(probability)}% over 100 ticks.`; break;
        case 'DIGITOVER': {
            const rates = Array.from({ length: 9 }, (_, b) => recent.filter(d => d > b).length / recent.length);
            barrier = rates.map((r, b) => ({ r, b })).sort((a, z) => Math.abs(a.r - 0.6) - Math.abs(z.r - 0.6))[0].b;
            probability = recent.filter(d => d > barrier!).length / recent.length * 100;
            reason = `Best observed Over barrier: ${barrier}; ${Math.round(probability)}% of the sample finished above it.`; break;
        }
        case 'DIGITUNDER': {
            const rates = Array.from({ length: 9 }, (_, b) => recent.filter(d => d < b).length / recent.length);
            barrier = rates.map((r, b) => ({ r, b })).sort((a, z) => Math.abs(a.r - 0.6) - Math.abs(z.r - 0.6))[0].b;
            probability = recent.filter(d => d < barrier!).length / recent.length * 100;
            reason = `Best observed Under barrier: ${barrier}; ${Math.round(probability)}% of the sample finished below it.`; break;
        }
        case 'DIGITMATCH': probability = modeRate * 100; barrier = mode; reason = `Digit ${mode} is the most frequent in the 100-tick window.`; break;
        case 'DIGITDIFF': probability = (1 - modeRate) * 100; barrier = mode; reason = `Digit ${mode} is the current match barrier; the sample differs ${Math.round(probability)}% of the time.`; break;
    }
    const parityConfirm = contract === 'DIGITEVEN' ? even > 0.54 : contract === 'DIGITODD' ? even < 0.46 : true;
    const shortConfirm = contract === 'DIGITMATCH' || contract === 'DIGITDIFF' ? shortMode === mode : true;
    const confirmations = Number(edge > 0.05) + Number(parityConfirm) + Number(shortConfirm) + Number(Math.abs(transitionStrength(short) - 0.1) > 0.015);
    const confidence = Math.min(95, Math.round(50 + edge * 100 * 0.75 + confirmations * 3));
    const action = confidence >= 68 && confirmations >= 3 ? 'ANALYZE' : confidence >= 58 ? 'WATCH' : 'WAIT';
    return { action, confidence, probability, reason, barrier, confirmations };
};

export const AIDigitAnalyser = () => {
    const [open, setOpen] = useState(false);
    const [symbol, setSymbol] = useState('R_75');
    const [contract, setContract] = useState<DigitContract>('DIGITOVER');
    const [windowSize, setWindowSize] = useState<WindowSize>(100);
    const [digits, setDigits] = useState<number[]>([]);
    const [connected, setConnected] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [lastQuote, setLastQuote] = useState<number | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const pipSizeRef = useRef(0.01);

    useEffect(() => {
        if (!open) return;
        const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';
        const socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        socketRef.current = socket; setDigits([]); setConnected(false); setError(''); setLoadingHistory(true);
        socket.onopen = () => {
            setConnected(true);
            socket.send(JSON.stringify({ ticks_history: symbol, count: 500, end: 'latest', style: 'ticks', adjust_start_time: 1 }));
            socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        };
        socket.onmessage = event => {
            try {
                const message = JSON.parse(event.data) as TickMessage;
                if (message.error?.message) { setError(message.error.message); setLoadingHistory(false); return; }
                if (message.history?.prices) {
                    if (message.history.pip_size) pipSizeRef.current = message.history.pip_size;
                    const historyDigits = message.history.prices.map(q => getLastDigit(Number(q), pipSizeRef.current));
                    setDigits(historyDigits.slice(-500)); setLoadingHistory(false); return;
                }
                if (message.tick?.quote == null) return;
                if (message.tick.pip_size) pipSizeRef.current = message.tick.pip_size;
                const quote = Number(message.tick.quote); setLastQuote(quote);
                setDigits(current => [...current, getLastDigit(quote, pipSizeRef.current)].slice(-500));
            } catch { setError('Received an unreadable market-data message.'); }
        };
        socket.onerror = () => { setConnected(false); setLoadingHistory(false); setError('Unable to connect to Deriv market data.'); };
        socket.onclose = () => setConnected(false);
        return () => { socket.close(); socketRef.current = null; };
    }, [open, symbol]);

    const selectedDigits = useMemo(() => digits.slice(-windowSize), [digits, windowSize]);
    const counts = useMemo(() => countDigits(selectedDigits), [selectedDigits]);
    const analysis = useMemo(() => analyze(contract, digits), [contract, digits]);
    const hot = counts.length ? counts.indexOf(Math.max(...counts)) : null;
    const cold = counts.length ? counts.indexOf(Math.min(...counts)) : null;
    const evenRate = selectedDigits.length ? selectedDigits.filter(d => d % 2 === 0).length / selectedDigits.length : 0;
    const overRate = selectedDigits.length ? selectedDigits.filter(d => d >= 5).length / selectedDigits.length : 0;
    const selectedContract = CONTRACTS.find(item => item.id === contract)?.label;

    return <div className='ai-digit-analyser'>
        {open && <div className='ai-digit-panel'>
            <div className='ai-digit-header'><div><div className='ai-digit-kicker'>SILVERBULLET AI • LIVE ENGINE</div><h3>Advanced Digit Analyzer</h3><span>Multi-window pattern and probability analysis</span></div><button className='ai-digit-close' onClick={() => setOpen(false)} aria-label='Close AI analyzer'>×</button></div>
            <div className='ai-digit-controls'>
                <label>Market<select value={symbol} onChange={e => setSymbol(e.target.value)}>{MARKETS.map(m => <option key={m.symbol} value={m.symbol}>{m.label}</option>)}</select></label>
                <label>Trade type<select value={contract} onChange={e => setContract(e.target.value as DigitContract)}>{CONTRACTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            </div>
            <div className='ai-window-row'>{WINDOWS.map(w => <button key={w} className={windowSize === w ? 'selected' : ''} onClick={() => setWindowSize(w)}>{w}</button>)}</div>
            <div className='ai-digit-status'><span className={connected ? 'dot online' : 'dot'} />{loadingHistory ? 'Loading 500 historical ticks…' : connected ? `Live ticks • ${digits.length}/500` : 'Disconnected'}{lastQuote !== null && <b>{lastQuote}</b>}</div>
            {error && <div className='ai-error'>{error}</div>}
            <div className='ai-digit-summary'>
                <div><small>LAST</small><strong>{digits.length ? digits[digits.length - 1] : '—'}</strong></div><div><small>HOT</small><strong>{digits.length ? hot : '—'}</strong></div><div><small>COLD</small><strong>{digits.length ? cold : '—'}</strong></div><div><small>STREAK</small><strong>{digits.length ? getStreak(digits) : '—'}</strong></div>
            </div>
            <div className='ai-digit-card ai-signal-card'><div className='ai-card-title'>AI SIGNAL <span>{selectedContract}</span></div><div className='ai-score-row'><strong>{analysis.confidence}%</strong><span className={`signal-${analysis.action.toLowerCase()}`}>{analysis.action}</span></div><p>{analysis.reason}</p><div className='ai-meta'><span>Historical probability <b>{Math.round(analysis.probability)}%</b></span><span>Confirmations <b>{analysis.confirmations}/4</b></span>{analysis.barrier !== null && <span>Barrier <b>{analysis.barrier}</b></span>}</div></div>
            <div className='ai-metrics'><div><small>EVEN</small><b>{Math.round(evenRate * 100)}%</b></div><div><small>ODD</small><b>{Math.round((1 - evenRate) * 100)}%</b></div><div><small>OVER 4</small><b>{Math.round(overRate * 100)}%</b></div><div><small>UNDER 5</small><b>{Math.round((1 - overRate) * 100)}%</b></div><div><small>ENTROPY</small><b>{selectedDigits.length ? entropy(selectedDigits).toFixed(2) : '—'}</b></div></div>
            <div className='ai-digit-card'><div className='ai-card-title'>DIGIT DISTRIBUTION <span>LAST {windowSize}</span></div><div className='digit-grid'>{counts.map((count, digit) => <div className='digit-item' key={digit}><span>{digit}</span><div className='digit-bar'><i style={{ width: `${selectedDigits.length ? Math.min(100, count / selectedDigits.length * 1000) : 0}%` }} /></div><b>{count}</b></div>)}</div></div>
            <div className='ai-digit-card'><div className='ai-card-title'>ENGINE CHECKS</div><div className='ai-checks'><span>✓ 500-tick history</span><span>✓ 5 analysis windows</span><span>✓ Hot/cold + streaks</span><span>✓ Parity + Over/Under</span><span>✓ Barrier analysis</span><span>✓ Transition analysis</span></div></div>
            <div className='ai-digit-footer'><span>AI engine foundation • statistical + pattern analysis</span><small>Signals are probabilistic research only and do not guarantee the next tick.</small></div>
        </div>}
        <button className={`ai-digit-bubble ${open ? 'active' : ''}`} onClick={() => setOpen(v => !v)} aria-label='Open AI Digit Analyzer'><span className='ai-orbit'>✦</span><strong>AI</strong><small>DIGITS</small></button>
    </div>;
};
export default AIDigitAnalyser;
