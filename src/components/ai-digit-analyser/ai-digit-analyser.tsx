import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ai-digit-analyser.scss';
import { analyzeDigits, countDigits, entropy, getLastDigit, streak, WINDOWS, type DigitContract, type WindowSize } from './digit-analysis';

type Market = { label: string; symbol: string };
type Tick = { quote?: number; symbol?: string; pip_size?: number; epoch?: number; id?: string };
type TickMessage = { msg_type?: string; history?: { prices?: number[]; times?: number[] }; pip_size?: number; tick?: Tick; error?: { message?: string; code?: string } };

const MARKETS: Market[] = [
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
const MAX_TICKS = 500;

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
    const [lastTickAt, setLastTickAt] = useState<number | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const pipSizeRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!open) return;
        const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';
        const socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        socketRef.current = socket;
        pipSizeRef.current = undefined;
        setDigits([]); setLastQuote(null); setLastTickAt(null); setConnected(false); setError(''); setLoadingHistory(true);

        socket.onopen = () => socket.send(JSON.stringify({ ticks_history: symbol, count: MAX_TICKS, end: 'latest', style: 'ticks', adjust_start_time: 1, subscribe: 0 }));
        socket.onmessage = event => {
            try {
                const message = JSON.parse(event.data) as TickMessage;
                if (message.error?.message) { setError(message.error.message); setLoadingHistory(false); return; }
                if (message.msg_type === 'history' && message.history?.prices) {
                    if (message.pip_size != null) pipSizeRef.current = message.pip_size;
                    const historyDigits = message.history.prices.map(price => getLastDigit(Number(price), pipSizeRef.current)).filter(Number.isFinite);
                    setDigits(historyDigits.slice(-MAX_TICKS)); setLoadingHistory(false);
                    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
                    return;
                }
                if (message.msg_type === 'tick' && message.tick?.quote != null) {
                    if (message.tick.pip_size != null) pipSizeRef.current = message.tick.pip_size;
                    const quote = Number(message.tick.quote);
                    if (!Number.isFinite(quote)) return;
                    setLastQuote(quote); setLastTickAt(Date.now());
                    setDigits(current => [...current, getLastDigit(quote, pipSizeRef.current)].slice(-MAX_TICKS));
                }
            } catch { setError('Received invalid market data from Deriv.'); }
        };
        socket.onerror = () => { setConnected(false); setLoadingHistory(false); setError('Unable to connect to Deriv market data.'); };
        socket.onclose = () => setConnected(false);
        return () => { if (socket.readyState === WebSocket.OPEN) socket.close(); socketRef.current = null; };
    }, [open, symbol]);

    useEffect(() => { if (!open) return; const timer = window.setInterval(() => setLastTickAt(value => value), 1000); return () => window.clearInterval(timer); }, [open]);

    const selectedDigits = useMemo(() => digits.slice(-windowSize), [digits, windowSize]);
    const counts = useMemo(() => countDigits(selectedDigits), [selectedDigits]);
    const analysis = useMemo(() => analyzeDigits(contract, selectedDigits), [contract, selectedDigits]);
    const hot = selectedDigits.length ? counts.indexOf(Math.max(...counts)) : null;
    const cold = selectedDigits.length ? counts.indexOf(Math.min(...counts)) : null;
    const evenRate = selectedDigits.length ? selectedDigits.filter(digit => digit % 2 === 0).length / selectedDigits.length : 0;
    const overRate = selectedDigits.length ? selectedDigits.filter(digit => digit >= 5).length / selectedDigits.length : 0;
    const selectedContract = CONTRACTS.find(item => item.id === contract)?.label;
    const stale = lastTickAt != null && Date.now() - lastTickAt > 10000;

    return <div className='ai-digit-analyser'>
        {open && <div className='ai-digit-panel'>
            <div className='ai-digit-header'><div><div className='ai-digit-kicker'>SILVERBULLET AI • LIVE ENGINE</div><h3>Advanced Digit Analyzer</h3><span>Statistical + pattern intelligence</span></div><button className='ai-digit-close' onClick={() => setOpen(false)} aria-label='Close AI analyzer'>×</button></div>
            <div className='ai-digit-controls'>
                <label>Market<select value={symbol} onChange={event => setSymbol(event.target.value)}>{MARKETS.map(market => <option key={market.symbol} value={market.symbol}>{market.label}</option>)}</select></label>
                <label>Trade type<select value={contract} onChange={event => setContract(event.target.value as DigitContract)}>{CONTRACTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            </div>
            <div className='ai-window-row'>{WINDOWS.map(window => <button key={window} className={windowSize === window ? 'selected' : ''} onClick={() => setWindowSize(window)}>{window}</button>)}</div>
            <div className='ai-digit-status'><span className={connected && !stale ? 'dot online' : 'dot'} />{loadingHistory ? 'Loading 500 historical ticks…' : stale ? 'Live stream appears stale' : connected ? `Live ticks • ${digits.length}/500` : 'Disconnected'}{lastQuote !== null && <b>{lastQuote}</b>}</div>
            {error && <div className='ai-error'>{error}</div>}
            <div className='ai-digit-summary'>
                <div><small>LAST</small><strong>{selectedDigits.length ? selectedDigits[selectedDigits.length - 1] : '—'}</strong></div><div><small>HOT</small><strong>{hot ?? '—'}</strong></div><div><small>COLD</small><strong>{cold ?? '—'}</strong></div><div><small>STREAK</small><strong>{selectedDigits.length ? streak(selectedDigits) : '—'}</strong></div>
            </div>
            <div className='ai-digit-card ai-signal-card'><div className='ai-card-title'>AI SIGNAL <span>{selectedContract}</span></div><div className='ai-score-row'><strong>{analysis.confidence}%</strong><span className={`signal-${analysis.action.toLowerCase()}`}>{analysis.action}</span></div><p>{analysis.reason}</p><div className='ai-meta'><span>Observed probability <b>{Math.round(analysis.probability)}%</b></span><span>Confirmations <b>{analysis.confirmations}/4</b></span><span>Barrier <b>{analysis.barrier ?? '—'}</b></span></div></div>
            <div className='ai-metrics'><div><small>EVEN</small><b>{Math.round(evenRate * 100)}%</b></div><div><small>ODD</small><b>{Math.round((1 - evenRate) * 100)}%</b></div><div><small>OVER 4</small><b>{Math.round(overRate * 100)}%</b></div><div><small>UNDER 5</small><b>{Math.round((1 - overRate) * 100)}%</b></div><div><small>ENTROPY</small><b>{selectedDigits.length ? entropy(selectedDigits).toFixed(2) : '—'}</b></div></div>
            <div className='ai-digit-card'><div className='ai-card-title'>DIGIT DISTRIBUTION <span>LAST {windowSize}</span></div><div className='digit-grid'>{counts.map((count, digit) => <div className='digit-item' key={digit}><span>{digit}</span><div className='digit-bar'><i style={{ width: `${selectedDigits.length ? Math.min(100, count / selectedDigits.length * 1000) : 0}%` }} /></div><b>{count}</b></div>)}</div></div>
            <div className='ai-digit-card'><div className='ai-card-title'>ENGINE CHECKS</div><div className='ai-checks'><span>✓ 500-tick history</span><span>✓ History before live stream</span><span>✓ 5 rolling windows</span><span>✓ Pip precision handling</span><span>✓ Valid Under barriers 1–9</span><span>✓ Pattern confirmations</span></div></div>
            <div className='ai-digit-footer'><span>AI engine foundation • statistical + pattern analysis</span><small>Observed probabilities do not guarantee the next tick or profitability.</small></div>
        </div>}
        <button className={`ai-digit-bubble ${open ? 'active' : ''}`} onClick={() => setOpen(value => !value)} aria-label='Open AI Digit Analyzer'><span className='ai-orbit'>✦</span><strong>AI</strong><small>DIGITS</small></button>
    </div>;
};
export default AIDigitAnalyser;
