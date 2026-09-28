import {beforeAll, afterAll, beforeEach, afterEach, expect, test} from 'vitest';
import http, {type Server} from 'node:http';
import st from 'st';
import {launchPuppeteer} from '../lib/puppeteer_config.ts';

import type {AddressInfo} from 'node:net';
import type {Browser, Page} from 'puppeteer';
import type {Map} from '../../../dist/maplibre-gl';

declare const map: Map;
let server: Server;
let browser: Browser;
let page: Page;
let errors: string[];

beforeAll(async () => {
    server = http.createServer(st(process.cwd()));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await launchPuppeteer();
}, 40000);

beforeEach(async () => {
    page = await browser.newPage();
    errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewport({width: 800, height: 600, deviceScaleFactor: 1});
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/test/examples/stars.html`);
    await page.evaluate(async () => {
        if (!map.loaded()) await map.once('load');
    });
}, 40000);

afterEach(async () => {
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
});

afterAll(async () => {
    await browser?.close();
    server?.close();
});

/** Counts bright star pixels outside and inside the central globe disk. */
async function pixels(): Promise<{stars: number; centerStars: number; image: string}> {
    return page.evaluate(async () => {
        map.triggerRepaint();
        await map.once('render');
        const canvas = map.getCanvas();
        const gl = canvas.getContext('webgl2');
        const data = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        let stars = 0;
        let centerStars = 0;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                if (data[i] <= 60 || Math.abs(data[i] - data[i + 2]) > 20) continue;
                stars++;
                if (Math.hypot(x - canvas.width / 2, y - canvas.height / 2) < 50) centerStars++;
            }
        }
        return {stars, centerStars, image: canvas.toDataURL()};
    });
}

test('renderer owns the stars, masks the globe, and disables them', {timeout: 30000}, async () => {
    await expect(page.title()).resolves.toBe('Stars');
    const enabled = await pixels();
    expect(enabled.stars).toBeGreaterThan(30);
    expect(enabled.centerStars).toBe(0);
    await page.click('#stars');
    expect((await pixels()).stars).toBe(0);
    await page.click('#stars');
    expect((await pixels()).image).toBe(enabled.image);
    expect(errors).toEqual([]);
});

test('stars rotate, survive resize, and reset on style replacement', {timeout: 30000}, async () => {
    const initial = await pixels();
    await page.evaluate(() => map.jumpTo({center: [60, 20], bearing: 30, pitch: 20}));
    expect((await pixels()).image).not.toBe(initial.image);
    await page.setViewport({width: 390, height: 844, deviceScaleFactor: 2});
    await page.evaluate(() => map.resize());
    expect((await pixels()).stars).toBeGreaterThan(10);
    await page.evaluate(async () => {
        map.setStyle({version: 8, sources: {}, layers: []}, {diff: false});
        await map.once('style.load');
    });
    expect((await pixels()).stars).toBe(0);
    expect(errors).toEqual([]);
});

test('opaque sky hides stars while a transparent night sky reveals them', {timeout: 30000}, async () => {
    await page.evaluate(() => {
        map.setProjection({type: 'mercator'});
        map.setMaxPitch(85);
        map.jumpTo({zoom: 3, pitch: 80});
    });
    expect((await pixels()).stars).toBeGreaterThan(10);
    await page.evaluate(() => map.setSky({
        'star-opacity': 1,
        'backdrop-color': '#070b14',
        'sky-color': 'black',
        'horizon-color': 'black',
        'atmosphere-blend': 0
    }));
    expect((await pixels()).stars).toBe(0);
    expect(errors).toEqual([]);
});

test('stars recover after WebGL context loss', {timeout: 30000}, async () => {
    const initial = await pixels();
    await page.evaluate(async () => {
        const canvas = map.getCanvas();
        const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
        await new Promise<void>((resolve) => {
            canvas.addEventListener('webglcontextrestored', () => resolve(), {once: true});
            canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 100), {once: true});
            extension.loseContext();
        });
    });
    expect((await pixels()).image).toBe(initial.image);
    expect(errors).toEqual([]);
});
