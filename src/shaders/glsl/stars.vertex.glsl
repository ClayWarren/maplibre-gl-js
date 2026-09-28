layout(location = 0) in vec2 a_pos;

uniform mat4 u_star_matrix;
uniform vec2 u_viewport;
out vec2 v_star_offset;
out float v_brightness;

void main() {
    float index = a_pos.x;
    float height = 1.0 - 2.0 * (index + 0.5) / 2048.0;
    float longitude = index * 2.399963229728653;
    float radius = sqrt(max(0.0, 1.0 - height * height));
    vec3 direction = vec3(sin(longitude) * radius, height, cos(longitude) * radius);
    vec2 corner = vec2(a_pos.y == 1.0 || a_pos.y == 2.0 ? 1.0 : -1.0,
                       a_pos.y >= 2.0 ? 1.0 : -1.0);
    float magnitude = mod(index * 73.0, 101.0) / 100.0;
    float size = 0.75 + magnitude * magnitude;
    vec4 projected = u_star_matrix * vec4(direction, 0.0);
    projected.xy += corner * size * 2.0 / u_viewport * projected.w;
    gl_Position = vec4(projected.xy, projected.w, projected.w);
    v_star_offset = corner;
    v_brightness = 0.25 + 0.75 * magnitude;
}
