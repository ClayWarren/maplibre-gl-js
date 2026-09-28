# Experimental sky stars

Implements the API proposed in [style-spec #1889](https://github.com/maplibre/maplibre-style-spec/issues/1889).
This branch is experimental, not a released or accepted style-spec extension.

```js
map.setSky({
    'star-opacity': 0.8,
    'backdrop-color': '#070b14',
    'sky-color': 'transparent',
    'horizon-color': 'transparent',
    'atmosphere-blend': 0
});
```

`star-opacity` defaults to zero and `backdrop-color` to transparent. Both support
zoom expressions, global-state expressions, and transitions through the existing
sky property machinery. An opaque sky covers stars; a transparent night sky can
reveal them near the ground. No additional automatic zoom fade is applied.
Removing the properties resets them to their defaults.

The renderer draws a deterministic sphere of 2,048 decorative directions. It is
not an astronomical catalog and has no time, constellation, or celestial-body
model. Directions rotate with the globe and camera. Billboard sizes are in CSS
pixels, independent of zoom and device pixel ratio. The globe and Mercator
horizon mask prevent stars from showing through transparent map content.

Stars use one draw call and a lazily allocated indexed mesh (32 KiB vertex data
and 24 KiB index data, excluding buffer capacity and VAOs). At zero opacity there
is no star draw call or initial mesh allocation. Meshes are released with the
style and rebuilt after context loss. A custom layer is the appropriate extension
point for scientifically accurate stars; image backdrops are outside this scope.

## Local source build

This renderer pins the `26.4.4-stars.1` style-spec package built from the
`codex/sky-stars` branch in ClayWarren/maplibre-style-spec. No compiled demo
artifacts or proprietary Mapbox code are used. The specification feature commit
is `c18faec7a0e007be660254219a18c4f61bd3a42b`.

```sh
npm ci --ignore-scripts
npm rebuild canvas
npm run codegen
npm run build-dist
npm run start-server
```

Open `http://localhost:9966/test/examples/stars.html`. Toggle stars, rotate and
zoom the globe, and resize the viewport. The example uses no external tiles.
Normal application dependencies remain unchanged until a source-pinned dogfood
package has been verified.

## Verification

- `npm run typecheck`
- `npm run test-unit`
- `npm run test-integration -- stars.test.ts`
- `npm run bench -- stars_program.bench.ts`

Browser tests exercise real WebGL pixels, globe occlusion, camera movement,
retina resizing, sky occlusion, disable/re-enable, full style replacement, and
context restoration. Native Metal/OpenGL implementation and application-level
Web/Desktop validation remain separate follow-up work.

CPU microbenchmarks on the development Mac measured approximately 0.043 ms for
one-time mesh creation and 0.0007 ms for uniform calculation. These are isolated
CPU measurements, not frame-time or GPU-performance guarantees. Windows/Linux,
Firefox/WebKit, sustained animation performance, and the real app integrations
still require validation before upstream submission or default enablement.
