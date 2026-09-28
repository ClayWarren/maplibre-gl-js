import {mat4} from 'gl-matrix';
import {Uniform1f, Uniform2f, UniformMatrix4f, type UniformLocations, type UniformValues} from '../uniform_binding.ts';
import {skyUniforms, skyUniformValues, type SkyUniformsType} from './sky_program.ts';

import type {Context} from '../context.ts';
import type {Sky} from '../../style/sky.ts';
import type {IReadonlyTransform} from '../../geo/transform_interface.ts';

export type StarsUniformsType = SkyUniformsType & {
    u_star_matrix: UniformMatrix4f;
    u_star_opacity: Uniform1f;
    u_viewport: Uniform2f;
};

/** Rotates an infinitely distant star sphere without applying camera translation. */
export function starRotationMatrix(transform: IReadonlyTransform): mat4 {
    const rotation = mat4.create();
    mat4.rotateZ(rotation, rotation, transform.rollInRadians);
    mat4.rotateX(rotation, rotation, -transform.pitchInRadians);
    mat4.rotateZ(rotation, rotation, transform.bearingInRadians);
    mat4.rotateX(rotation, rotation, transform.center.lat * Math.PI / 180);
    mat4.rotateY(rotation, rotation, -transform.center.lng * Math.PI / 180);
    return mat4.multiply(rotation, transform.projectionMatrix, rotation);
}

export function starsUniforms(context: Context, locations: UniformLocations): StarsUniformsType {
    return {
        ...skyUniforms(context, locations),
        u_star_matrix: new UniformMatrix4f(context, locations.u_star_matrix),
        u_star_opacity: new Uniform1f(context, locations.u_star_opacity),
        u_viewport: new Uniform2f(context, locations.u_viewport)
    };
}

export function starsUniformValues(sky: Sky, transform: IReadonlyTransform, pixelRatio: number): UniformValues<StarsUniformsType> {
    return {
        ...skyUniformValues(sky, transform, pixelRatio),
        u_star_matrix: starRotationMatrix(transform),
        u_star_opacity: sky.properties.get('star-opacity'),
        u_viewport: [transform.width, transform.height]
    };
}
