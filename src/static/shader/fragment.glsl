varying vec2 vUv;
uniform float time;
void main()	{
	float dash = sin(vUv.x * 50. - time);
	if (dash < 0.) discard;
	gl_FragColor = vec4(vUv.x,0.,0.0,1.);
}