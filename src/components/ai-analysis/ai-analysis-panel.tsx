import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ai-analysis-panel.scss';

type Asset = { symbol: string; name: string; type: string; market: string; submarket: string };
type Contract = { contract_type: string; display_name: string; market?: string; submarket?: string };
type TickAnalysis = { price: number; change: number; momentum: number; sma9: number; sma21: number; rsi14: number; volatility: number; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; ticks: number };

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, letter => letter.toUpperCase());
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const calculateRsi = (prices: number[], period = 14) => {
    if (prices.length <= period) return 50;
    const changes = prices.slice(1).map((price, index) => price - prices[index]);
    const recent = changes.slice(-period);
    const avgGain = average(recent.filter(value => value > 0));
    const avgLoss = average(recent.filter(value => value < 0).map(Math.abs));
    if (!avgLoss) return avgGain ? 100 : 50;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
};
const analysePrices = (prices: number[]): TickAnalysis => {
    const clean = prices.filter(Number.isFinite);
    const price = clean[clean.length - 1] || 0;
    const previous = clean[clean.length - 2] || price;
    const changes = clean.slice(1).map((value, index) => value - clean[index]);
    const recentChanges = changes.slice(-50);
    const meanAbsChange = average(recentChanges.map(Math.abs));
    const momentum = clean.length >= 20 ? ((price - clean[clean.length - 20]) / (meanAbsChange || 1)) : 0;
    const sma9 = average(clean.slice(-9));
    const sma21 = average(clean.slice(-21));
    const rsi14 = calculateRsi(clean, 14);
    const volatility = average(recentChanges.map(Math.abs));
    const trend = sma9 > sma21 * 1.00002 && rsi14 >= 52 ? 'BULLISH' : sma9 < sma21 * 0.99998 && rsi14 <= 48 ? 'BEARISH' : 'NEUTRAL';
    return { price, change: price - previous, momentum, sma9, sma21, rsi14, volatility, trend, ticks: clean.length };
};
const requestDeriv = (request: Record<string, unknown>) => new Promise<any>((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    const timeout = window.setTimeout(() => { socket.close(); reject(new Error('Deriv request timed out.')); }, 15000);
    socket.onopen = () => socket.send(JSON.stringify(request));
    socket.onmessage = event => {
        try {
            const data = JSON.parse(event.data);
            if (data.error) { clearTimeout(timeout); socket.close(); reject(new Error(data.error.message || 'Deriv API request failed.')); return; }
            if (data.msg_type === 'active_symbols' || data.msg_type === 'contracts_for' || data.msg_type === 'history') { clearTimeout(timeout); socket.close(); resolve(data); }
        } catch {}
    };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error('Could not connect to Deriv market data.')); };
});
const fetchLiveTick = (symbol: string, onTick: (price: number) => void) => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    socket.onmessage = event => { try { const data = JSON.parse(event.data); if (data.tick?.quote !== undefined) onTick(Number(data.tick.quote)); } catch {} };
    return () => { try { socket.send(JSON.stringify({ forget_all: 'ticks' })); } catch {} socket.close(); };
};

const AIAnalysisPanel = () => {
    const [open, setOpen] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [marketFilter, setMarketFilter] = useState('ALL');
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [selectedContract, setSelectedContract] = useState('');
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [analysing, setAnalysing] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [error, setError] = useState('');
    const [marketData, setMarketData] = useState<TickAnalysis | null>(null);
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [result, setResult] = useState<any>(null);
    const cleanupTick = useRef<null | (() => void)>(null);
    const markets = useMemo(() => ['ALL', ...Array.from(new Set(assets.map(asset => asset.market).filter(Boolean)))], [assets]);
    const filteredAssets = useMemo(() => assets.filter(asset => marketFilter === 'ALL' || asset.market === marketFilter), [assets, marketFilter]);
    const selectedAsset = assets.find(asset => asset.symbol === selectedSymbol);

    const loadAssets = useCallback(async () => {
        setLoadingAssets(true); setError(''); setStatus('Loading live Deriv markets…');
        try {
            const data = await requestDeriv({ active_symbols: 'full' });
            const rows = Array.isArray(data.active_symbols) ? data.active_symbols : [];
            const normalized: Asset[] = rows.map((item: any) => ({
                symbol: item.underlying_symbol || item.symbol,
                name: item.underlying_symbol_name || item.display_name || item.symbol,
                type: item.underlying_symbol_type || item.market || 'Other',
                market: item.market || item.underlying_symbol_type || 'Other',
                submarket: item.submarket || '',
            })).filter((item: Asset) => item.symbol);
            setAssets(normalized.sort((a, b) => a.name.localeCompare(b.name)));
            if (!selectedSymbol && normalized[0]) setSelectedSymbol(normalized[0].symbol);
            setStatus(`${normalized.length} live Deriv assets loaded`);
        } catch (err: any) { setError(err.message || 'Could not load Deriv assets.'); setStatus('Deriv connection failed'); }
        finally { setLoadingAssets(false); }
    }, [selectedSymbol]);

    useEffect(() => { if (open && !assets.length) loadAssets(); }, [open, assets.length, loadAssets]);
    useEffect(() => {
        setContracts([]); setSelectedContract(''); setMarketData(null); setResult(null);
        if (!selectedSymbol) return;
        let cancelled = false;
        const loadContracts = async () => {
            setLoadingContracts(true); setError(''); setStatus('Loading available option contracts…');
            try {
                const data = await requestDeriv({ contracts_for: selectedSymbol });
                const rows = Array.isArray(data.contracts_for?.available) ? data.contracts_for.available : [];
                const normalized = rows.map((item: any) => ({
                    contract_type: item.contract_type,
                    display_name: item.contract_display || item.contract_type_name || titleCase(item.contract_type || ''),
                    market: item.market, submarket: item.submarket,
                })).filter((item: Contract) => item.contract_type);
                if (!cancelled) { setContracts(normalized); setSelectedContract(normalized[0]?.contract_type || ''); setStatus(`${normalized.length} contracts available for ${selectedSymbol}`); }
            } catch (err: any) { if (!cancelled) { setError(err.message || 'Could not load contracts for this asset.'); setStatus('Contract lookup failed'); } }
            finally { if (!cancelled) setLoadingContracts(false); }
        };
        loadContracts(); return () => { cancelled = true; };
    }, [selectedSymbol]);
    useEffect(() => () => cleanupTick.current?.(), []);

    const analyseMarket = async () => {
        if (!selectedSymbol || !selectedContract) return;
        setAnalysing(true); setError(''); setResult(null); setStatus('Pulling historical Deriv ticks…'); cleanupTick.current?.();
        try {
            const data = await requestDeriv({ ticks_history: selectedSymbol, end: 'latest', count: 500, style: 'ticks', adjust_start_time: 1 });
            const prices = (data.history?.prices || []).map(Number).filter(Number.isFinite);
            if (prices.length < 25) throw new Error('Deriv returned too little history for a reliable analysis.');
            const stats = analysePrices(prices); setMarketData(stats); setStatus('Starting live tick stream…');
            cleanupTick.current = fetchLiveTick(selectedSymbol, price => setLivePrice(price)); setLivePrice(stats.price); setStatus('Sending observed market data to SilverBulletFX AI…');
            const response = await fetch('/api/ai-analysis', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ market: selectedAsset?.market || selectedAsset?.type || 'Deriv', asset: selectedAsset?.name || selectedSymbol, symbol: selectedSymbol, contract: selectedContract, contract_name: contracts.find(item => item.contract_type === selectedContract)?.display_name, prices: prices.slice(-250), statistics: stats }),
            });
            const ai = await response.json(); if (!response.ok) throw new Error(ai.error || 'AI analysis request failed.');
            setResult(ai.analysis); setStatus('Analysis complete — live ticks remain connected');
        } catch (err: any) { setError(err.message || 'Market analysis failed.'); setStatus('Analysis failed'); }
        finally { setAnalysing(false); }
    };

    return <>
        <button className='sbf-ai-bubble' type='button' onClick={() => setOpen(true)} aria-label='Open SilverBulletFX AI Analysis'><span className='sbf-ai-bubble__orb'>✦</span><span>AI Analysis</span></button>
        {open && <div className='sbf-ai-overlay' role='dialog' aria-modal='true' aria-label='SilverBulletFX AI Analysis'>
            <div className='sbf-ai-panel'>
                <div className='sbf-ai-header'><div><div className='sbf-ai-kicker'>SILVERBULLET FX // DERIV INTELLIGENCE</div><h2>AI Market Analysis</h2><p>Live Deriv assets → contracts → ticks → quantitative analysis → AI.</p></div><button type='button' className='sbf-ai-close' onClick={() => setOpen(false)}>×</button></div>
                <div className='sbf-ai-grid'>
                    <section className='sbf-ai-card'><div className='sbf-ai-card-title'>01 / MARKET</div><div className='sbf-ai-row'><label>Market family<select value={marketFilter} onChange={event => setMarketFilter(event.target.value)}>{markets.map(market => <option key={market} value={market}>{titleCase(market)}</option>)}</select></label><label>Deriv asset<select value={selectedSymbol} onChange={event => setSelectedSymbol(event.target.value)} disabled={loadingAssets || !filteredAssets.length}>{filteredAssets.map(asset => <option key={asset.symbol} value={asset.symbol}>{asset.name} — {asset.symbol}</option>)}</select></label></div><button type='button' className='sbf-ai-secondary' onClick={loadAssets} disabled={loadingAssets}>{loadingAssets ? 'Refreshing…' : '↻ Refresh live assets'}</button></section>
                    <section className='sbf-ai-card'><div className='sbf-ai-card-title'>02 / OPTIONS CONTRACT</div><label>Available contract<select value={selectedContract} onChange={event => setSelectedContract(event.target.value)} disabled={loadingContracts || !contracts.length}>{contracts.map(contract => <option key={contract.contract_type} value={contract.contract_type}>{contract.display_name} ({contract.contract_type})</option>)}</select></label><div className='sbf-ai-contract-status'>{loadingContracts ? 'Querying Deriv…' : `${contracts.length} contract types returned by Deriv`}</div></section>
                </div>
                <div className='sbf-ai-actionbar'><div><span className='sbf-ai-status-dot' /> {status}</div><button type='button' className='sbf-ai-analyse' onClick={analyseMarket} disabled={analysing || !selectedSymbol || !selectedContract}>{analysing ? 'ANALYSING…' : 'ANALYZE MARKET'}</button></div>
                {error && <div className='sbf-ai-error'>{error}</div>}
                {marketData && <section className='sbf-ai-card sbf-ai-market-stats'><div className='sbf-ai-card-title'>03 / DERIV MARKET DATA</div><div className='sbf-ai-stats'><div><span>PRICE</span><strong>{livePrice ?? marketData.price}</strong></div><div><span>TREND</span><strong>{marketData.trend}</strong></div><div><span>RSI 14</span><strong>{marketData.rsi14.toFixed(1)}</strong></div><div><span>SMA 9 / 21</span><strong>{marketData.sma9.toFixed(5)} / {marketData.sma21.toFixed(5)}</strong></div><div><span>MOMENTUM</span><strong>{marketData.momentum.toFixed(2)}</strong></div><div><span>TICKS</span><strong>{marketData.ticks}</strong></div></div></section>}
                {result && <section className='sbf-ai-card sbf-ai-result'><div className='sbf-ai-card-title'>04 / AI DECISION SUPPORT</div><div className='sbf-ai-result-grid'><div><span>BIAS</span><strong>{result.bias || '—'}</strong></div><div><span>CONFIDENCE</span><strong>{result.confidence ?? '—'}%</strong></div><div><span>ACTION</span><strong>{result.action || 'WAIT'}</strong></div><div><span>PREFERRED CONTRACT</span><strong>{result.preferred_contract || selectedContract}</strong></div></div><p><b>Evidence:</b> {result.evidence || 'No evidence returned.'}</p><p><b>Risk:</b> {result.risk_note || 'No risk note returned.'}</p><div className='sbf-ai-disclaimer'>Decision support only. The AI does not guarantee an outcome and does not place a trade.</div></section>}
            </div>
        </div>}
    </>;
};
export default AIAnalysisPanel;
