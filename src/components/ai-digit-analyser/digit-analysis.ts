export type DigitContract = 'DIGITOVER' | 'DIGITUNDER' | 'DIGITEVEN' | 'DIGITODD' | 'DIGITMATCH' | 'DIGITDIFF';
export type WindowSize = 10 | 25 | 50 | 100 | 500;

export const WINDOWS: WindowSize[] = [10, 25, 50, 100, 500];

export const precisionFromPipSize = (pipSize?: number): number => {
    if (!Number.isFinite(pipSize) || !pipSize || pipSize <= 0) return 2;
    if (pipSize < 1) return Math.max(0, Math.ceil(-Math.log10(pipSize)));
    return Math.min(10, Math.max(0, Math.round(pipSize)));
};

export const getLastDigit = (quote: number, pipSize?: number): number => {
    if (!Number.isFinite(quote)) return 0;
    const precision = precisionFromPipSize(pipSize);
    const fixed = Math.abs(quote).toFixed(precision);
    const decimal = fixed.includes('.') ? fixed.split('.')[1] : '';
    return Number((decimal || fixed).slice(-1));
};

export const countDigits = (digits: number[]): number[] => {
    const counts = Array.from({ length: 10 }, () => 0);
    digits.forEach(digit => {
        if (Number.isInteger(digit) && digit >= 0 && digit <= 9) counts[digit] += 1;
    });
    return counts;
};

export const entropy = (digits: number[]): number => {
    if (!digits.length) return 0;
    return countDigits(digits).reduce((sum, count) => {
        if (!count) return sum;
        const probability = count / digits.length;
        return sum - probability * Math.log2(probability);
    }, 0);
};

export const streak = (digits: number[]): number => {
    if (!digits.length) return 0;
    const last = digits[digits.length - 1];
    let length = 0;
    for (let i = digits.length - 1; i >= 0 && digits[i] === last; i -= 1) length += 1;
    return length;
};

export const repeatRate = (digits: number[]): number => {
    if (digits.length < 2) return 0;
    let repeats = 0;
    for (let i = 1; i < digits.length; i += 1) if (digits[i] === digits[i - 1]) repeats += 1;
    return repeats / (digits.length - 1);
};

const rate = (digits: number[], predicate: (digit: number) => boolean): number =>
    digits.length ? digits.filter(predicate).length / digits.length : 0;

const bestOverBarrier = (digits: number[]) => {
    const candidates = Array.from({ length: 9 }, (_, barrier) => ({
        barrier,
        probability: rate(digits, digit => digit > barrier),
    }));
    return candidates.sort((a, b) => Math.abs(a.probability - 0.6) - Math.abs(b.probability - 0.6))[0];
};

const bestUnderBarrier = (digits: number[]) => {
    // Deriv digit-under barriers are 1–9; digit 0 is not a valid under barrier.
    const candidates = Array.from({ length: 9 }, (_, index) => index + 1).map(barrier => ({
        barrier,
        probability: rate(digits, digit => digit < barrier),
    }));
    return candidates.sort((a, b) => Math.abs(a.probability - 0.6) - Math.abs(b.probability - 0.6))[0];
};

export interface DigitAnalysis {
    action: 'COLLECTING' | 'WAIT' | 'WATCH' | 'ANALYZE';
    confidence: number;
    probability: number;
    barrier: number | null;
    confirmations: number;
    reason: string;
    sampleSize: number;
}

export const analyzeDigits = (contract: DigitContract, digits: number[]): DigitAnalysis => {
    const sample = digits.slice(-100);
    if (sample.length < 25) {
        return {
            action: 'COLLECTING', confidence: 0, probability: 50, barrier: null, confirmations: 0,
            reason: `Collecting data: ${sample.length}/25 minimum ticks.`, sampleSize: sample.length,
        };
    }

    const counts = countDigits(sample);
    const mode = counts.indexOf(Math.max(...counts));
    const modeRate = counts[mode] / sample.length;
    const even = rate(sample, digit => digit % 2 === 0);
    const recent = sample.slice(-25);
    const recentCounts = countDigits(recent);
    const recentMode = recentCounts.indexOf(Math.max(...recentCounts));

    let probability = 50;
    let barrier: number | null = null;
    let reason = '';

    switch (contract) {
        case 'DIGITEVEN': probability = even * 100; reason = `Even occurred ${Math.round(probability)}% of the last ${sample.length} ticks.`; break;
        case 'DIGITODD': probability = (1 - even) * 100; reason = `Odd occurred ${Math.round(probability)}% of the last ${sample.length} ticks.`; break;
        case 'DIGITOVER': {
            const result = bestOverBarrier(sample);
            barrier = result.barrier;
            probability = result.probability * 100;
            reason = `Observed Over ${barrier} probability is ${Math.round(probability)}%.`;
            break;
        }
        case 'DIGITUNDER': {
            const result = bestUnderBarrier(sample);
            barrier = result.barrier;
            probability = result.probability * 100;
            reason = `Observed Under ${barrier} probability is ${Math.round(probability)}%.`;
            break;
        }
        case 'DIGITMATCH': probability = modeRate * 100; barrier = mode; reason = `Digit ${mode} is the most frequent digit at ${Math.round(probability)}%.`; break;
        case 'DIGITDIFF': probability = (1 - modeRate) * 100; barrier = mode; reason = `Against barrier ${mode}, observed Different probability is ${Math.round(probability)}%.`; break;
    }

    const edge = Math.abs(probability - 50) / 100;
    const probabilityConfirm = edge >= 0.05;
    const directionConfirm = contract === 'DIGITEVEN' ? even >= 0.54 : contract === 'DIGITODD' ? even <= 0.46 : true;
    const modeConfirm = contract === 'DIGITMATCH' || contract === 'DIGITDIFF' ? recentMode === mode : true;
    const repeatConfirm = Math.abs(repeatRate(recent) - 0.1) >= 0.015;
    const confirmations = [probabilityConfirm, directionConfirm, modeConfirm, repeatConfirm].filter(Boolean).length;
    const confidence = Math.min(95, Math.round(50 + edge * 75 + confirmations * 3));
    const action = confidence >= 68 && confirmations >= 3 ? 'ANALYZE' : confidence >= 58 ? 'WATCH' : 'WAIT';

    return { action, confidence, probability, barrier, confirmations, reason, sampleSize: sample.length };
};
