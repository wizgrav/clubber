//Ether by nimitz (twitter: @stormoid)

#define t iGlobalTime
mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}
float map(vec3 p){
    p.xz*= m(t*0.3+dot(iMusic[0].xw,iMusic[1].xw));p.xy*= m(t*0.3+min(iMusic[1].w,iMusic[2].w));
    vec3 q = p*(1. + iMusic[0].w)+t;
    return length(p+vec3(sin(t*0.4 + dot(iMusic[1].xz,iMusic[2].xz))))*log(length(p)+1.) + sin(q.x+sin(q.z+sin(q.y)))*(0.3+dot(iMusic[1].xz,iMusic[3].xz)/2.) - 1.;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){	
	vec2 p = fragCoord.xy/iResolution.y - vec2(.9,.5);
    vec3 cl = vec3(0.);
    float d = 2.5;
    for(int i=0; i<=5; i++)	{
		vec3 p = vec3(0,0,5.) + normalize(vec3(p, -1.))*d;
        float rz = map(p);
		float f =  clamp((rz - map(p+.1))*length(iMusic[1].xz), -.1, 1. );
        vec3 l = vec3(0.1,0.3,.4) + (vec3(5., 2.5, 3.) - length(iMusic[0].xyz))*f;
        cl = cl*l + (1.-smoothstep(iMusic[0].w, 3. - iMusic[3].z, rz))*.7*l;
		d += min(rz, 1.);
	}
    fragColor = vec4(cl, 1.);
}