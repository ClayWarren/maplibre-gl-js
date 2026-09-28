import {expect, test} from 'vitest';
import {vec4} from 'gl-matrix';
import {VerticalPerspectiveTransform} from '../../geo/projection/vertical_perspective_transform.ts';
import {LngLat} from '../../geo/lng_lat.ts';
import {starRotationMatrix} from './stars_program.ts';
import {createStarMeshArrays, drawStars, STAR_COUNT} from '../draw/draw_stars.ts';
import {Sky} from '../../style/sky.ts';

import type {Painter} from '../../render/painter.ts';

test('disabled stars need no graphics context or geometry allocation', () => {
    const sky = new Sky({}, {});
    drawStars({} as Painter, sky);
    expect(sky.starsMesh).toBeUndefined();
});

test('star geometry is deterministic and fits one indexed segment', () => {
    const first = createStarMeshArrays();
    const second = createStarMeshArrays();
    expect(first.vertices).toHaveLength(STAR_COUNT * 4);
    expect(first.indices).toHaveLength(STAR_COUNT * 2);
    expect(first.vertices.length).toBeLessThan(65536);
    expect(first.vertices.int16).toEqual(second.vertices.int16);
    expect(first.indices.uint16).toEqual(second.indices.uint16);
});

test('star directions turn with the globe but do not translate with zoom', () => {
    const transform = new VerticalPerspectiveTransform();
    transform.resize(800, 600);
    transform.setCenter(new LngLat(0, 0));
    transform.setZoom(0);
    const first = vec4.transformMat4(vec4.create(), [0.2, 0.1, -1, 0], starRotationMatrix(transform));
    transform.setZoom(5);
    const zoomed = vec4.transformMat4(vec4.create(), [0.2, 0.1, -1, 0], starRotationMatrix(transform));
    expect(zoomed[0] / zoomed[3]).toBeCloseTo(first[0] / first[3]);
    expect(zoomed[1] / zoomed[3]).toBeCloseTo(first[1] / first[3]);
    transform.setCenter(new LngLat(20, 30));
    const rotated = vec4.transformMat4(vec4.create(), [0.2, 0.1, -1, 0], starRotationMatrix(transform));
    expect(rotated[0] / rotated[3]).not.toBeCloseTo(first[0] / first[3]);
});
