// Created by Vinicius Graciano Santos - vgs/2014
// This shader needs some serious work on collision avoidance :D
// http://viniciusgraciano.com/blog/making-of-bacterium/

#define STEPS 64
#define EPS 0.002
#define FAR 18.0
#define PI 3.14159265359

float smin(float a, float b, float k) {
    float h = clamp(.5+.5*(b-a)/k, 0.0, 1.0 );
    return mix(b,a,h)-k*h*(1.-h);
}

vec2 rep(vec2 p) {
    float a = atan(p.y, p.x);
    a = mod(a, 2.0*PI/18.) - PI/18.;
    return length(p)*vec2(cos(a), sin(a));
}

float spikedBall(vec3 p) {
    p = mod(p, 8.0) - 4.0;
    float d = length(p) - 1. - length(iMusic[2].xw)/2.;
    p.xz = rep(p.xz); p.xy = rep(p.xy); 
    return smin(d, length(p.yz)-.1+abs(.15*(p.x - 0.5 - abs(iMusic[2].z - iMusic[2].w)/2.)), 0.1);
}

float capsules(vec3 p) {
    vec3 q = floor(p/4.0);
    p = mod(p, 4.0) - 2.0;
    p.yz = p.yz*cos(iGlobalTime + q.z) + vec2(-p.z, p.y)*sin(iGlobalTime + q.z);
    p.xy = p.xy*cos(iGlobalTime + q.x) + vec2(-p.y, p.x)*sin(iGlobalTime + q.x);
    p.zx = p.zx*cos(iGlobalTime + q.y) + vec2(-p.x, p.z)*sin(iGlobalTime + q.y);
    
    float angle = .3*cos(iGlobalTime + length(iMusic[1].xz))*p.x;
    p.xy = cos(angle  +  dot(iMusic[1].xw, iMusic[0].xw))*p.xy + sin(angle  +  min(iMusic[0].w, iMusic[1].w))*vec2(-p.y, p.x); p.x += 1.0; 
    float k = clamp(2.0*p.x/4.0, 0.0, 1.0); p.x -= 2.*k;
    return length(p) - .5;
}

float map(vec3 p) {   
   return min(spikedBall(p), capsules(p));
}

vec3 normal(vec3 p) {
    vec2 q = vec2(0.0, EPS);
    return normalize(vec3(map(p + q.yxx) - map(p - q.yxx),
                          map(p + q.xyx) - map(p - q.xyx),
                          map(p + q.xxy) - map(p - q.xxy)));
}

float cubeMap(vec3 p, vec3 n) {
    float a = texture2D(iChannel0, p.yz).r;
    float b = texture2D(iChannel0, p.xz).r;
    float c = texture2D(iChannel0, p.xy).r;
    n = abs(n);
    return (a*n.x + b*n.y + c*n.z)/(n.x+n.y+n.z);   
}

vec3 bumpMap(vec3 p, vec3 n, float c) {
    vec2 q = vec2(0.0, .5);
	vec3 grad = -1.0*(vec3(cubeMap(p+q.yxx, n), cubeMap(p+q.xyx, n), cubeMap(p+q.xxy, n))-c)/q.y;
    vec3 t = grad - n*dot(grad, n);
    return normalize(n - t);
}

vec3 shade(vec3 ro, vec3 rd, float t) {
    vec3 p = ro + t*rd, n = normal(p);
   
    vec3 green = pow(vec3(93,202,49)/255., vec3(2.2));
    vec3 yellow = pow(vec3(255,204,0)/255., vec3(2.2));
    
    float k = cubeMap(.5*p, n);
    n = bumpMap(.5*p, n, k);
    
    vec3 col = mix(green, yellow, k)*(1.0-dot(-rd,n));
    if (spikedBall(p) < capsules(p)) {
    	p = mod(p, 8.0) - 4.0;
        col *= 1.0/(1.0 + .5*dot(p, p));
    }
        
    return col*exp(-.008*t*t);
}

mat3 lookat(vec3 p, vec3 t) {
    vec3 z = normalize(p - t);
    vec3 x = cross(z, vec3(0.0, 1.0, 0.0));
    return mat3(x, cross(x, z), z);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec2 uv = (-iResolution.xy + 2.0*fragCoord.xy) / iResolution.y;
    uv *= 1.0 + .1*dot(uv,uv);
    
    vec3 ro = vec3(iGlobalTime, iGlobalTime, cos(iGlobalTime));
    vec3 rd = normalize(lookat(ro, ro+vec3(cos(.1*iGlobalTime), sin(.1*iGlobalTime), 1.0))*vec3(uv, -1.0)); // direÃ§Ã£o do raio.
    
    // based on eiffie's antialiasing method (https://www.shadertoy.com/view/XsSXDt)
    vec3 col = vec3(0.0);
    vec4 stack = vec4(-1.0); bool grab = true;
    float t = 0.0, d = EPS, od = d, pix = 4.0/iResolution.x, w = 1.8, s = 0.0;
    for (int i = 0; i < STEPS; ++i) {
        d = map(ro + t*rd);
        if (w > 1.0 && (od + d < s)) {
            s -= w*s; w = 1.0;
        } else {
            s = d * w;   
        	if (d <= od) grab = true;
        	else if (grab && stack.w < 0. && od < pix*(t-od)) {
            	stack.w = t-od; stack = stack.wxyz; 
            	grab = false;
        	}
        	if (d < EPS || t > FAR) break;
        }
        od = d; t += s; 
    }
    col = d < EPS ? shade(ro, rd, t) : col;
    
    col = smoothstep(0., .7, col);
    col = pow(col, vec3(1.0/2.2));
    
	fragColor = vec4(col,1.0);
}