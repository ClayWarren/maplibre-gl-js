precision highp float;

uniform float u_star_opacity;
uniform mat4 u_inv_proj_matrix;
uniform vec3 u_globe_position;
uniform float u_globe_radius;
uniform float u_sky_blend;
uniform vec2 u_horizon;
uniform vec2 u_horizon_normal;
uniform vec2 u_viewport;

in vec2 v_star_offset;
in float v_brightness;

void main() {
    vec2 ndc = 2.0 * gl_FragCoord.xy / (u_viewport * u_device_pixel_ratio) - 1.0;
    vec3 ray = normalize((u_inv_proj_matrix * vec4(ndc, 0.0, 1.0)).xyz);
    float closest = dot(ray, u_globe_position);
    float distanceSquared = dot(u_globe_position, u_globe_position) - closest * closest;
    float outsideGlobe = closest <= 0.0 || distanceSquared > u_globe_radius * u_globe_radius ? 1.0 : 0.0;
    float aboveHorizon = step(0.0, dot(gl_FragCoord.xy - u_horizon, u_horizon_normal));
    float visibility = mix(aboveHorizon, outsideGlobe, u_sky_blend);
    float alpha = (1.0 - smoothstep(0.1, 1.0, length(v_star_offset))) * v_brightness * u_star_opacity * visibility;
    fragColor = vec4(vec3(alpha), alpha);
}
