uniform sampler2D iRect;
uniform vec4 iBounds[4];

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = fragCoord/iResolution.xy;
    float v = texture2D(iRect, vec2(uv.x,0.)).r;
    float alpha = fwidth(v);
    vec4 c = vec4(0.);
    vec2 c2 = vec2(0.);
    for(int i=0; i < 4; i++){
      c2 = min(step(iBounds[i].xz,uv),step(uv, iBounds[i].yw));
      c.r = min(c2.x, c2.y);
      c.rgba = c.gbar;
    }
    c.rgb = c.a == 1.0 ? c.rgb * 0.2 + 0.3 : c.rgb * 0.5;
    c.rgb += smoothstep(uv.y - alpha, uv.y, v) * (0.5 - 0.1 * step(mod(uv.x * 128.0, 12.0), 128.0/iResolution.x));
    fragColor.rgb=c.rgb;
}