void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = vec2(fragCoord.x, fragCoord.y - iResolution.z )/iResolution.xy;
    
    vec4 color = vec4(0.);
    float inc = 1. / 25.;
    uv.x -= inc * 0.5;
    for(float i=0.;i<4.;i++){
      float ii = i*inc*5.;
      if(uv.x < ii || uv.x >= (i+1.)*inc*5.) continue;
      vec4 m = iMusic[int(i)];
      for(float j=0.;j<4.;j++) {
        float v = m.x;
        m.xyzw = m.yzwx;
        color.xyzw = color.yzwx;
        
        if(uv.x < ii + j * inc || uv.x >= ii + (j + 1.) * inc) { 
          continue;
        }

        if(uv.y > v){ 
          color.w = 0.2;
          continue;
        }
        color.w = 1.0;
      }
    }

    float ii = 4. * inc * 5.;
    if(uv.x > ii && uv.x < inc*25.) {
      vec4 m = iClubber;
      for(float j=0.;j<4.;j++) {
        float v = m.x;
        m.xyzw = m.yzwx;
        color.xyzw = color.yzwx;
        if(uv.x < ii + j * inc || uv.x >= ii + (j + 1.) * inc) { 
          continue;
        }

        if(uv.y > v){ 
          color.w = 0.2;
          continue;
        }
        color.w = 1.0;
      }
    }
    if(color.a == 0.2) color.rgb = vec3(0.2);
    else if(color.a == 1.0) color.rgb = vec3(1.);
    color.a = 1.0;
    fragColor=color;
}