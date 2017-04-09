void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = fragCoord/iResolution.xy;
    vec4 color = vec4(0.);
    float inc = 1. / 20.;
    
    for(float i=0.;i<4.;i++){
      float ii = i*inc*5.;
      if(uv.x < ii || uv.x >= (i+1.)*inc*5.) continue;
      vec4 m = iMusic[int(i)];
      for(float j=0.;j<4.;j++) {
        float v = m.x;
        m.xyzw = m.yzwx;
        color.xyzw = color.yzwx;
        if(uv.y > v || uv.x < ii + j * inc || uv.x >= ii + (j + 1.) * inc) continue;
        color.w = 1.0;
      }
    }
    if(color.a == 1.0) color.rgb = vec3(1.);
    color.a = 1.0;
    fragColor=color;
}