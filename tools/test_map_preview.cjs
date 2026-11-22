// Run against a local static server; browser paths can be supplied by the host.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const url = process.env.MAP_URL || 'http://127.0.0.1:8137/index.html';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  try {
    for (const width of [1440, 1024, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      const tooltip = page.getByRole('tooltip');
      const pin = page.locator('.pin[data-feature-id="the-bat-egg"]');
      await pin.hover();
      await tooltip.waitFor({ state: 'visible' });
      assert.match(await tooltip.innerText(), /The Bat Egg/);
      assert.match(await tooltip.locator('img').getAttribute('src'), /the-bat-egg/);
      assert.ok(await tooltip.locator('img').evaluate(img => img.decode().then(() => img.naturalWidth > 0)));
      assert.doesNotMatch(await tooltip.locator('img').getAttribute('src'), /page-001/);
      await tooltip.hover();
      await page.waitForTimeout(250);
      assert.ok(await tooltip.isVisible(), 'Moving onto the preview keeps it readable');
      await page.keyboard.press('Escape');
      assert.ok(!(await tooltip.isVisible()), 'Escape dismisses the preview');
      await page.mouse.move(0, 0);
      await page.getByRole('button', { name: 'Full screen', exact: true }).focus();
      await pin.focus();
      await tooltip.waitFor({ state: 'visible' });
      assert.equal(await pin.getAttribute('aria-describedby'), 'mapPreviewDescription');
      await page.keyboard.press('Enter');
      await page.locator('#modal[open]').waitFor();
      assert.ok(!(await tooltip.isVisible()), 'Opening details removes the preview');
      await page.locator('#modalClose').click();
      await page.mouse.move(0, 0);
      await page.getByRole('button', { name: 'Full screen', exact: true }).focus();
      await page.keyboard.press('Escape');
      for (const id of ['giant-chair', 'dead-hedge', 'hibernaculum', 'our-sweet-track']) {
        await page.mouse.move(0, 0);
        await page.keyboard.press('Escape');
        await page.locator(`.pin[data-feature-id="${id}"]`).hover();
        await tooltip.waitFor({ state: 'visible' });
        const r = await tooltip.boundingBox();
        assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= 900, `${id} preview stays on screen at ${width}px`);
      }
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: path.join(process.env.MAP_SCREENSHOTS || os.tmpdir(), `hooke-pin-preview-${width}.png`) });
      }
      if (width === 1440) {
        for (const featurePin of await page.locator('.pin').all()) {
          await page.mouse.move(0, 0);
          await page.keyboard.press('Escape');
          await featurePin.hover();
          await tooltip.waitFor({ state: 'visible' });
          assert.ok(await tooltip.locator('img').evaluate(img => img.decode().then(() => img.naturalWidth > 0)), 'Every pinned feature has a working preview image');
          assert.ok((await tooltip.locator('.map-preview__description').innerText()).length > 0);
        }
      }
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Hide pins', exact: true }).click();
      assert.ok(!(await tooltip.isVisible()));
      assert.deepEqual(errors, []);
      await page.close();
    }

    // The in-page fullscreen fallback moves the map into a modal top layer.
    const fullscreen = await browser.newPage({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
    await fullscreen.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }));
    await fullscreen.goto(url);
    await fullscreen.getByRole('button', { name: 'Full screen', exact: true }).click();
    await fullscreen.locator('.pin[data-feature-id="hibernaculum"]').hover();
    await fullscreen.getByRole('tooltip').waitFor({ state: 'visible' });
    assert.ok(await fullscreen.locator('#atlasDialog #mapPreview').isVisible());
    await fullscreen.keyboard.press('Escape');
    assert.ok(await fullscreen.locator('#atlasDialog').isVisible(), 'First Escape dismisses the preview, retaining the full map');
    await fullscreen.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await fullscreen.locator('.pin[data-feature-id="the-bat-egg"]').hover();
    await fullscreen.getByRole('tooltip').waitFor({ state: 'visible' });
    await fullscreen.locator('#atlasViewport').evaluate(el => { el.scrollLeft += 60; });
    await fullscreen.waitForTimeout(100);
    assert.ok(await fullscreen.getByRole('tooltip').isVisible(), 'Preview follows its pin when the map scrolls');
    await fullscreen.locator('#atlasViewport').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await fullscreen.getByRole('tooltip').waitFor({ state: 'hidden' });
    await fullscreen.close();

    const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    await touch.goto(url);
    await touch.locator('.pin[data-feature-id="toad-pond"]').tap();
    await touch.locator('#modal[open]').waitFor();
    assert.ok(!(await touch.getByRole('tooltip').isVisible()), 'Touch opens the feature directly');
    await touch.close();
    console.log('Map previews passed: photographs, hover continuity, keyboard, Escape, screen edges, full screen, zoom and touch.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
