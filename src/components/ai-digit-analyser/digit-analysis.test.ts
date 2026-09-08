import { analyzeDigits, countDigits, entropy, getLastDigit, precisionFromPipSize, repeatRate, streak } from './digit-analysis';

describe('digit-analysis', () => {
    test('converts Deriv pip sizes to decimal precision', () => {
        expect(precisionFromPipSize(0.01)).toBe(2);
        expect(precisionFromPipSize(0.0001)).toBe(4);
        expect(precisionFromPipSize(5)).toBe(5);
    });

    test('extracts the last decimal digit correctly', () => {
        expect(getLastDigit(123.45, 0.01)).toBe(5);
        expect(getLastDigit(123.456, 0.001)).toBe(6);
        expect(getLastDigit(123.45678, 5)).toBe(8);
    });

    test('counts digits and calculates entropy', () => {
        expect(countDigits([0, 1, 1, 9])).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 1]);
        expect(entropy([0, 1, 2, 3])).toBe(2);
    });

    test('calculates streak and repeat rate', () => {
        expect(streak([1, 2, 2, 2])).toBe(3);
        expect(repeatRate([1, 1, 2, 2])).toBeCloseTo(1 / 3);
    });

    test('does not produce a signal before minimum sample size', () => {
        const result = analyzeDigits('DIGITOVER', Array(10).fill(5));
        expect(result.action).toBe('COLLECTING');
        expect(result.confidence).toBe(0);
    });

    test('selects a valid Under barrier', () => {
        const digits = Array.from({ length: 100 }, (_, i) => i % 10);
        const result = analyzeDigits('DIGITUNDER', digits);
        expect(result.barrier).toBeGreaterThanOrEqual(1);
        expect(result.barrier).toBeLessThanOrEqual(9);
    });
});
