import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { getTrains, parseTrains } from './rfi-api';
import { mapTrains } from './trains-service';
const fixture = readFileSync('tests/fixtures/rfi.html', 'utf8');
afterEach(() => vi.unstubAllGlobals());
it('parses RFI columns, notes and calling points', () => {
	const train = parseTrains(fixture)[0];
	expect(train).toMatchObject({ number: '1234', platform: '2', delay: '5', isBlinking: true });
	expect(train.stopTimes).toEqual([
		{ name: 'LAVIS', time: '12:40' },
		{ name: 'BOLZANO', time: '13:10' },
	]);
});
it('distinguishes valid empty board from error or malformed HTML', () => {
	expect(parseTrains(fixture.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody></tbody>'))).toEqual([]);
	expect(() => parseTrains('<html>Maintenance</html>')).toThrow('Unrecognized');
	expect(() => parseTrains(fixture.replace('12:30', 'invalid'))).toThrow('Invalid');
});
it('ignores RFI padding rows in populated and empty boards', () => {
	const padding = `<tr>${'<td> \n<div> </div></td>'.repeat(9)}</tr>`;
	expect(parseTrains(fixture.replace('</tbody>', padding.repeat(4) + '</tbody>'))).toEqual(
		parseTrains(fixture),
	);
	expect(
		parseTrains(
			fixture.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${padding.repeat(15)}</tbody>`),
		),
	).toEqual([]);
});
it('still rejects populated rows missing a carrier and malformed empty rows', () => {
	expect(() => parseTrains(fixture.replace('<img alt="TRENITALIA" />', ''))).toThrow(
		'Invalid RFI train row',
	);
	expect(() => parseTrains(fixture.replace('</tbody>', '<tr><td></td></tr></tbody>'))).toThrow(
		'Invalid RFI train row',
	);
});
it('rejects upstream error status even with otherwise valid HTML', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(fixture, { status: 503 })),
	);
	await expect(getTrains('2912')).rejects.toThrow('503');
});
it('normalizes cancellations, replacements and incomplete details', () => {
	const train = parseTrains(fixture)[0];
	const replacement = mapTrains([{ ...train, delay: 'Cancellato', notes: 'Bus sostitutivo' }])[0];
	expect(replacement.isReplacedByBus).toBe(true);
	expect(replacement.platform).toBe('');
	const incomplete = mapTrains([{ ...train, delay: 'Cancellato', notes: '', stopTimes: [] }])[0];
	expect(incomplete.isIncomplete).toBe(true);
});
