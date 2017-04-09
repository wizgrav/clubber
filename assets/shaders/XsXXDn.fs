// Based on https://www.shadertoy.com/view/XsXXDn

#define t iGlobalTime
#define r iResolution.xy

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec3 c;
    float l,z=t;
    for(int i=0;i<3;i++) {
        vec2 uv,p=fragCoord.xy/r;
        uv=p;
        p-=.5 ;
        p.x*=r.x/r.y;
        z+=.05+.05*dot(iMusic[0].yz, iMusic[1].yz);
        l=length(p);
        uv+=p/l*(sin(z - length(iMusic[2].xyz)*iMusic[1].w) + mix(iMusic[1].z,0.1, iMusic[2].z * iMusic[3].w))*abs(sin(l*mix(8.-iMusic[0].x, 10.-iMusic[2].x,iMusic[1].w)-z - iMusic[0].w));
        c[i]=mix(.01, .02, min(iMusic[1].x*iMusic[3].x,iMusic[2].x*iMusic[3].x))/length(abs(mod(uv,mix(0.9,1.1,length( iMusic[3].yw)))-.5));
    }
    fragColor=vec4(c/l,t);
}