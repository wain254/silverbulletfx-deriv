exports.handler = async event => {
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return response(503, { error: 'AI backend is not configured. Add OPENAI_API_KEY in Netlify environment variables.' });

    try {
        const body = JSON.parse(event.body || '{}');
        const { market, contract, windowSize, digits, statistics } = body;
        if (!market || !contract || !Array.isArray(digits) || digits.length < 25) {
            return response(400, { error: 'Provide a market, contract, and at least 25 digits.' });
        }

        const safeDigits = digits.slice(-500).filter(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9);
        const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
        const prompt = [
            'You are SilverBulletFX Advanced Digit AI.',
            'Analyze Deriv digit-market statistics as a research assistant, not as a guarantee of future outcomes.',
            'Do not invent market data, probabilities, barriers, or certainty. Clearly distinguish observed historical frequency from prediction.',
            'Return concise JSON with keys: bias, confidence, preferred_barrier, evidence, risk_note, action.',
            'action must be one of WAIT, WATCH, ANALYZE. Never tell the user that a trade is guaranteed or risk-free.',
            `Market: ${market}`,
            `Contract: ${contract}`,
            `Selected window: ${windowSize}`,
            `Recent digits: ${safeDigits.join(',')}`,
            `Computed statistics: ${JSON.stringify(statistics || {})}`,
        ].join('\\n');

        const apiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: prompt, max_output_tokens: 300 }),
        });

        const data = await apiResponse.json();
        if (!apiResponse.ok) return response(apiResponse.status, { error: data?.error?.message || 'AI provider request failed.' });

        const text = data.output_text || data.output?.flatMap(item => item.content || []).map(item => item.text || '').join('') || '';
        let analysis;
        try { analysis = JSON.parse(text); } catch { analysis = { bias: 'UNPARSED', confidence: 0, preferred_barrier: null, evidence: text, risk_note: 'AI response was not valid JSON.', action: 'WAIT' }; }
        return response(200, { analysis, model });
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
