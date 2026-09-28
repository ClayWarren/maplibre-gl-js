import {describe, expect, test, vi, afterEach} from 'vitest';
import {Sky} from './sky.ts';
import {latest as styleSpec} from '@maplibre/maplibre-gl-style-spec';

import type {EvaluationParameters} from './evaluation_parameters.ts';
import type {TransitionParameters} from './properties.ts';

const spec = styleSpec.sky;

test('stars are opt-in and backdrop defaults to transparent', () => {
    const sky = new Sky({}, {});
    expect(sky.properties.get('star-opacity')).toBe(0);
    expect(sky.properties.get('backdrop-color').a).toBe(0);
});

test('stars and backdrop read global state', () => {
    const sky = new Sky({
        'star-opacity': ['number', ['global-state', 'opacity'], 0],
        'backdrop-color': ['to-color', ['global-state', 'backdrop']]
    }, {opacity: 0.7, backdrop: 'red'});
    expect(sky.properties.get('star-opacity')).toBe(0.7);
    expect(sky.properties.get('backdrop-color').r).toBe(1);
});

test('star opacity and backdrop evaluate zoom expressions', () => {
    const sky = new Sky({
        'star-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0],
        'backdrop-color': ['interpolate', ['linear'], ['zoom'], 0, 'black', 10, 'white']
    }, {});
    sky.recalculate({zoom: 5, zoomHistory: {}} as EvaluationParameters);
    expect(sky.properties.get('star-opacity')).toBe(0.5);
    expect(sky.properties.get('backdrop-color').r).toBeCloseTo(0.5);
});

test('stars and backdrop transition and reset when omitted', () => {
    const sky = new Sky({'star-opacity': 0, 'backdrop-color': 'black'}, {});
    sky.setSky({'star-opacity': 1, 'backdrop-color': 'white'});
    sky.updateTransitions({now: 0, transition: {duration: 1000, delay: 0}});
    sky.recalculate({zoom: 0, now: 500, zoomHistory: {}} as EvaluationParameters);
    expect(sky.properties.get('star-opacity')).toBeCloseTo(0.5);
    expect(sky.properties.get('backdrop-color').r).toBeCloseTo(0.5);
    sky.setSky({});
    sky.updateTransitions({now: 2000, transition: {duration: 0, delay: 0}});
    sky.recalculate({zoom: 0, now: 2000, zoomHistory: {}} as EvaluationParameters);
    expect(sky.properties.get('star-opacity')).toBe(0);
    expect(sky.properties.get('backdrop-color').a).toBe(0);
    expect(sky.getSky()).toEqual({});
});

test('removing sky disables stars and clears the backdrop', () => {
    const sky = new Sky({'star-opacity': 1, 'backdrop-color': 'red'}, {});
    sky.setSky(undefined);
    sky.updateTransitions({now: 0, transition: {duration: 0, delay: 0}});
    sky.recalculate({zoom: 0, now: 1, zoomHistory: {}} as EvaluationParameters);
    expect(sky.properties.get('star-opacity')).toBe(0);
    expect(sky.properties.get('backdrop-color').a).toBe(0);
});

test('Sky with defaults', () => {
    const sky = new Sky({}, {});
    sky.recalculate({zoom: 0, zoomHistory: {}} as EvaluationParameters);

    expect(sky.properties.get('atmosphere-blend')).toEqual(spec['atmosphere-blend'].default);
});

test('Sky with options', () => {
    const sky = new Sky({
        'atmosphere-blend': 0.4
    }, {});
    sky.recalculate({zoom: 0, zoomHistory: {}} as EvaluationParameters);

    expect(sky.properties.get('atmosphere-blend')).toBe(0.4);
});

test('Sky with interpolate function', () => {
    const sky = new Sky({
        'atmosphere-blend': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            5, 1,
            7, 0
        ]
    }, {});
    sky.recalculate({zoom: 6, zoomHistory: {}} as EvaluationParameters);

    expect(sky.properties.get('atmosphere-blend')).toBe(0.5);
});

test('Sky.getSky', () => {
    const defaults = {'atmosphere-blend': 0.8};

    expect(new Sky(defaults, {}).getSky()).toEqual(defaults);
});

describe('Sky.setSky', () => {
    test('sets Sky', () => {
        const sky = new Sky({}, {});
        sky.setSky({'atmosphere-blend': 1});
        sky.updateTransitions({
            now: 0,
            transition: {
                duration: 3000,
                delay: 0
            }
        });
        sky.recalculate({zoom: 16, zoomHistory: {}, now: 1500} as EvaluationParameters);
        expect(sky.properties.get('atmosphere-blend')).toBe(0.9);
    });

    test('validates by default', () => {
        const sky = new Sky({}, {});
        const skySpy = vi.spyOn(sky, '_validate');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        sky.setSky({'atmosphere-blend': -1});
        sky.updateTransitions({transition: false} as any as TransitionParameters);
        sky.recalculate({zoom: 16, zoomHistory: {}, now: 10} as EvaluationParameters);
        expect(skySpy).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(skySpy.mock.calls[0][2]).toEqual({});
    });

    test('respects validation option', () => {
        const sky = new Sky({}, {});

        const skySpy = vi.spyOn(sky, '_validate');
        sky.setSky({'atmosphere-blend': -1}, {validate: false});
        sky.updateTransitions({transition: false} as any as TransitionParameters);
        sky.recalculate({zoom: 16, zoomHistory: {}, now: 10} as EvaluationParameters);

        expect(skySpy).toHaveBeenCalledTimes(1);
        expect(skySpy.mock.calls[0][2]).toEqual({validate: false});
        expect(sky.properties.get('atmosphere-blend')).toBe(-1);
    });
});

describe('Sky runtime error logging', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('warns with the sky property location when an expression errors at runtime', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const sky = new Sky({}, {});
        // global-state defeats constant-folding, so this fails at evaluation time (not parse time).
        sky.setSky({'sky-color': ['to-color', ['global-state', 'missing']]} as any, {validate: false});
        sky.updateTransitions({transition: false} as any as TransitionParameters);
        sky.recalculate({zoom: 16, zoomHistory: {}, now: 10} as EvaluationParameters);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toBe('sky.sky-color: Could not parse color from value \'null\' Falling back to rgba(136,198,252,1).');
    });
});
