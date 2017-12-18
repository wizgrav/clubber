uniform sampler2D iRect;
uniform vec4 iBounds;

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = fragCoord/iResolution.xy;
    float v = texture2D(iRect, vec2(uv.x,0.)).r;
    float alpha = fwidth(v);
    vec4 c = vec4(0.);
    vec2 c2 = vec2(0.);
    c2 = min(step(iBounds.xz,uv),step(uv, iBounds.yw));
    c.rgb = vec3(min(c2.x, c2.y) * 0.25);
    c.rgb += smoothstep(uv.y - alpha, uv.y, v) * (0.5 - 0.1 * step(mod(uv.x * 128.0, 12.0), 128.0/iResolution.x));
    fragColor.rgb=c.rgb;
}