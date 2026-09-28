import {PosArray, TriangleIndexArray} from '../../data/array_types.g.ts';
import posAttributes from '../../data/pos_attributes.ts';
import {SegmentVector} from '../../data/segment.ts';
import {Mesh} from '../../render/mesh.ts';
import {ColorMode} from '../color_mode.ts';
import {CullFaceMode} from '../cull_face_mode.ts';
import {DepthMode} from '../depth_mode.ts';
import {StencilMode} from '../stencil_mode.ts';
import {starsUniformValues} from '../program/stars_program.ts';

import type {Painter} from '../../render/painter.ts';
import type {Sky} from '../../style/sky.ts';

/** Number of equal-area star directions, shared with the vertex shader. */
export const STAR_COUNT = 2048;

/** Four indexed billboard corners per star keep star size independent of camera zoom. */
export function createStarMeshArrays(): {vertices: PosArray; indices: TriangleIndexArray} {
    const vertices = new PosArray();
    const indices = new TriangleIndexArray();
    for (let star = 0; star < STAR_COUNT; star++) {
        for (let corner = 0; corner < 4; corner++) vertices.emplaceBack(star, corner);
        const start = star * 4;
        indices.emplaceBack(start, start + 1, start + 2);
        indices.emplaceBack(start, start + 2, start + 3);
    }
    return {vertices, indices};
}

/** Draws the star sphere before the sky; zero opacity allocates no mesh or shader. */
export function drawStars(painter: Painter, sky: Sky): void {
    if (sky.properties.get('star-opacity') === 0) return;
    const context = painter.context;
    if (!sky.starsMesh) {
        const {vertices, indices} = createStarMeshArrays();
        sky.starsMesh = new Mesh(
            context.createVertexBuffer(vertices, posAttributes.members),
            context.createIndexBuffer(indices),
            SegmentVector.simpleSegment(0, 0, vertices.length, indices.length)
        );
    }
    const mesh = sky.starsMesh;
    const uniforms = starsUniformValues(sky, painter.renderContext.transform, painter.pixelRatio);
    painter.useProgram('stars').draw(context, context.gl.TRIANGLES, DepthMode.disabled,
        StencilMode.disabled, ColorMode.alphaBlended, CullFaceMode.disabled, uniforms,
        null, null, 'stars', mesh.vertexBuffer, mesh.indexBuffer, mesh.segments);
}
