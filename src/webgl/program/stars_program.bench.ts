import {test} from 'vitest';
import {Sky} from '../../style/sky.ts';
import {VerticalPerspectiveTransform} from '../../geo/projection/vertical_perspective_transform.ts';
import {starsUniformValues} from './stars_program.ts';
import {createStarMeshArrays} from '../draw/draw_stars.ts';

const sky = new Sky({'star-opacity': 1}, {});
const transform = new VerticalPerspectiveTransform();
transform.resize(1000, 700);
transform.setZoom(0);

test('star mesh allocation and per-frame uniform calculation', async ({bench}) => {
    await bench('one-time star geometry', () => createStarMeshArrays()).run();
    await bench('per-frame star uniforms', () => starsUniformValues(sky, transform, 2)).run();
});
