exports.handler = async event => {
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return response(503, { error: 'AI backend is not configured. Add OPENAI_API_KEY in Netlify environment variables.' });

    try {
        const body = JSON.parse(event.body || '{}');
        const { market, asset, symbol, contract, contract_name, prices, statistics, digits, windowSize } = body;
        const cleanPrices = Array.isArray(prices) ? prices.slice(-250).map(Number).filter(Number.isFinite) : [];
        const cleanDigits = Array.isArray(digits) ? digits.slice(-500).filter(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9) : [];

        if (!market || !contract || (!cleanPrices.length && cleanDigits.length < 25)) {
            return response(400, { error: 'Provide a Deriv market, contract, and observed market data.' });
        }

        const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
        const prompt = [
            'You are SilverBulletFX Advanced Deriv Options AI.',
            'You are a decision-support research assistant. Analyze only the observed Deriv data supplied below.',
            'Do not invent prices, probabilities, barriers, signals, or certainty. Do not claim a guaranteed win.',
            'Use the selected contract only as the requested options contract context; do not pretend the contract is profitable merely because it is available.',
            'Return concise valid JSON with exactly these keys: bias, confidence, preferred_contract, suggested_duration, entry_condition, invalidation, evidence, risk_note, action.',
            'bias must be BULLISH, BEARISH, or NEUTRAL. confidence must be a 0-100 number representing analytical confidence, not probability of profit.',
            'action must be WAIT, WATCH, or ANALYZE.',
            `Market family: ${market}`,
            `Asset: ${asset || symbol || 'Unknown'}`,
            `Deriv symbol: ${symbol || 'Unknown'}`,
            `Selected options contract: ${contract_name || contract}`,
            `Historical prices (most recent last): ${JSON.stringify(cleanPrices)}`,
            `Computed statistics: ${JSON.stringify(statistics || {})}`,
            cleanDigits.length ? `Recent digits: ${cleanDigits.join(',')}` : '',
            windowSize ? `Analysis window: ${windowSize}` : '',
        ].filter(Boolean).join('\n');

        const apiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: prompt, max_output_tokens: 500 }),
        });

        const data = await apiResponse.json();
        if (!apiResponse.ok) return response(apiResponse.status, { error: data?.error?.message || 'AI provider request failed.' });

        const text = data.output_text || data.output?.flatMap(item => item.content || []).map(item => item.text || '').join('') || '';
        let analysis;
        try {
            analysis = JSON.parse(text);
        } catch {
            analysis = {
                bias: 'NEUTRAL', confidence: 0, preferred_contract: contract,
                suggested_duration: 'WAIT', entry_condition: 'WAIT FOR A CLEAR SETUP',
                invalidation: 'Any material change in market structure or volatility',
                evidence: text, risk_note: 'AI response was not valid JSON.', action: 'WAIT'
            };
        }
        return response(200, { analysis, model, symbol, market });
    } catch (error) {
        return response(500, { error: error instanceof Error ? error.message : 'AI analysis failed.' });
    }
};

function response(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(body),
    };
}
