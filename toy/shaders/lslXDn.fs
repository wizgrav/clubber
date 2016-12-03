//Colorful tessellation by nimitz (stormoid.com) (twitter: @stormoid)

//flat version
//#define flat

#define WARP_ORDER 1.

#define time iGlobalTime

float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
float noise( in vec2 x ){return texture2D(iChannel0, x*.01).x;}

mat2 m2 = mat2( 0.80,  0.60, -0.60,  0.80 );
float fbm( in vec2 p )
{	
	float z=2.;
	float rz = 0.;
	p *= 0.25;
	for (float i= 1.;i < 6.;i++ )
	{
		rz+= (sin(noise(p)*5. )*0.5+0.5) /z;
		z = z*2.;
		p = p*2.*m2;
	}
	return rz;
}

vec2 field4( in vec2 x )
{
	vec2 n = floor(x);
	vec2 f = fract(x);

	vec2 m = vec2(5.,0.);
	//4 samples
	for(int j=0; j<=1; j++)
	for(int i=0; i<=1; i++)
    {
		vec2 g = vec2( float(i),float(j) );
		vec2 r = g - f;
		float minkpow = max(0.2,max(iMusic[3].w,iMusic[1].w))*3.+ min(iMusic[1].w,iMusic[2].w);
		float d = pow(pow(abs(r.x),minkpow)+pow(abs(r.y),minkpow),1./minkpow)*.5;
		d *= max(0.5,max(iMusic[1].w,iMusic[2].w))*1.4+.5;
		d = sin(d*10.+time*0.1 + iMusic[0].w);
		m.x *= d;
		m.y += d*1. ;
    }
	return pow(abs(m),vec2(0.8));
}

vec2 warp(vec2 uv, vec2 p, float offset)
{
	uv -= p;
	float minkpow = WARP_ORDER;
	float d = pow(pow(abs(uv.x),minkpow)+pow(abs(uv.y),minkpow),1./minkpow);
	uv /= pow(d,2.+iMusic[2].x*iMusic[2].y)*1.-offset;
	uv += p;
	return uv;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 p = fragCoord.xy / iResolution.xy-0.5;
	p.x *= iResolution.x/iResolution.y;
	p*= 5.;
	
	#ifndef flat
	p = warp(p,vec2(0.),-.1);
	#endif
	
	vec2 rz = field4(p);
	
	vec3 col = sin(vec3(.9,0.6,0.2)*rz.y*1.4)*rz.x;
	col = pow(col,vec3(.99))*.85;
	
	//lights
	vec3 ligt = normalize(vec3(sin(time)*10.,1.,cos(time)*10.));
	vec3 nor = normalize(vec3(dFdx(rz.y), .08, dFdy(rz.y)));
	
	//fbm variation on the normals
	nor.xz *= fbm(p*4.);
	vec3 bnor = nor;
	nor.yz *= fbm(p*2.);
	
	float dif = clamp(dot( nor,ligt ),0.0,1.0)*1.9;
	col *= 0.5+.4*dif;
	col *= 1.+3e2*pow(abs(dot(bnor,ligt)), 30.);
	
	//simple fbm "texturing"
	col *= fbm(p*70.)*0.2+0.85;
	
	//vignetting
	col *= 1.-pow(dot(p,p),2.+ min(iMusic[1].z, iMusic[2].z))*0.9e-4;
	
	fragColor = vec4(pow(col,vec3(0.6))-0.1,1.0);
}