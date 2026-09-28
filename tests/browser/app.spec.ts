import { test, expect } from '@playwright/test';

test('favorites persist without navigating and keyboard opens trip', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Aggiungi ai preferiti' }).click();
	await expect(page).toHaveURL('/');
	await page.reload();
	await expect(page.getByRole('button', { name: 'Rimuovi dai preferiti' })).toHaveAttribute(
		'aria-pressed',
		'true',
	);
	await page.goto('/90001');
	const trip = page.getByRole('button', { name: /Povo/ });
	await trip.focus();
	await page.keyboard.press('Space');
	await expect(trip).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText('La tua fermata 📍', { exact: true })).toBeVisible();
	await expect
		.poll(() =>
			page
				.locator('.pt-1.pb-3')
				.evaluate(
					(element) =>
						Math.abs(
							element.parentElement!.getBoundingClientRect().height -
								element.getBoundingClientRect().height,
						) < 1,
				),
		)
		.toBe(true);
	await page.screenshot({
		path: 'test-results/bus-mobile.png',
		fullPage: true,
		animations: 'disabled',
	});
});

test('corrupt storage and denied geolocation remain usable', async ({ page, context }) => {
	await context.clearPermissions();
	await page.addInitScript(() => {
		localStorage.setItem('tqp_stops_favorites', '{broken');
		localStorage.setItem('tqp_stops_default_tab', 'invalid');
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				getCurrentPosition: (_success: unknown, error: (value: unknown) => void) =>
					error({ code: 1 }),
			},
		});
	});
	page.on('dialog', (dialog) => dialog.dismiss());
	await page.goto('/');
	await page.getByRole('button', { name: /Consenti accesso/ }).click();
	await expect(page.getByRole('button', { name: /Consenti accesso/ })).toBeVisible();
	await page.getByRole('button', { name: /Cerca/ }).click();
	await page.getByRole('searchbox').fill('Stazione');
	await expect(page.getByRole('link', { name: /Stazione Test/ })).toBeVisible();
});

test('train arrivals, favorites and reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/treni/trentofs/arrivi');
	await expect(page.getByRole('button', { name: /Bolzano/ })).toBeVisible();
	await page.getByRole('button', { name: 'Aggiungi ai preferiti' }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Rimuovi dai preferiti' })).toBeVisible();
	await page.screenshot({ path: 'test-results/train-mobile.png', fullPage: true });
});

test('hidden tabs pause polling and visible tabs refresh immediately', async ({ page }) => {
	await page.clock.install();
	await page.goto('/90001');
	await expect(page.getByRole('button', { name: /Povo/ })).toBeVisible();
	let polls = 0;
	page.on('request', (request) => {
		if (request.url().includes('/api/stops/')) polls++;
	});
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await page.clock.fastForward(31_000);
	expect(polls).toBe(0);
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect.poll(() => polls).toBe(1);
});

test('failed polling preserves board, hides expired predictions, and recovers', async ({
	page,
}) => {
	await page.clock.install();
	await page.goto('/90001');
	await expect(page.getByRole('button', { name: /Povo/ })).toBeVisible();
	const snapshot = await (await page.request.get('/api/stops/90001')).json();
	await page.route('**/api/stops/*', (route) =>
		route.fulfill({ status: 503, body: 'Unavailable' }),
	);
	await page.clock.fastForward(31_000);
	await expect(page.getByText(/Aggiornamento non disponibile/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Povo/ })).toBeVisible();
	await page.clock.fastForward(100_000);
	await expect(page.getByText(/Dati troppo vecchi/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Povo/ })).not.toBeVisible();
	await page.unroute('**/api/stops/*');
	await page.route('**/api/stops/*', async (route) => {
		snapshot.details.lastUpdatedAt = await page.evaluate(() => new Date().toISOString());
		await route.fulfill({ json: snapshot });
	});
	await page.clock.fastForward(31_000);
	await expect(page.getByRole('button', { name: /Povo/ })).toBeVisible();
	await expect(page.getByText(/Dati troppo vecchi/)).not.toBeVisible();
});
