const vertex = `attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const updateFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D source;
uniform vec2 px;
uniform vec2 pointer;
uniform float inject;
uniform float feed;
uniform float kill;
uniform float phase;
void main(){
 vec4 c=texture2D(source,uv); float a=c.r,b=c.g;
 vec2 e=vec2(px.x,0.), n=vec2(0.,px.y);
 vec4 lap=texture2D(source,uv+e)+texture2D(source,uv-e)+texture2D(source,uv+n)+texture2D(source,uv-n)-4.*c;
 float reaction=a*b*b;
 float na=a+(.92*lap.r-reaction+feed*(1.-a))*.32;
 float nb=b+(.48*lap.g+reaction-(kill+feed)*b)*.32;
 float d=distance(uv,pointer);
 float splat=smoothstep(.016,.0,d)*inject;
 nb=max(nb,splat); na-=splat*.28;
 float seed=step(.9985,fract(sin(dot(floor(uv*420.)+phase,vec2(12.9898,78.233)))*43758.5453));
 nb=max(nb,seed*.18*inject);
 gl_FragColor=vec4(clamp(na,0.,1.),clamp(nb,0.,1.),c.b*.985+inject*.01,1.);
}`;
const displayFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D source;
uniform vec2 px;
uniform float quality;
uniform float opacity;
vec3 pal(float x){
 vec3 a=quality<.5?vec3(.12,.18,.28):(quality<1.5?vec3(.08,.34,.27):vec3(.48,.08,.06));
 vec3 b=quality<.5?vec3(.64,.28,.58):(quality<1.5?vec3(.72,.20,.48):vec3(.05,.46,.38));
 return mix(a,b,smoothstep(.08,.58,x));
}
void main(){vec4 c=texture2D(source,uv);float v=clamp((c.g-c.r*.14)*1.7,0.,1.);float l=texture2D(source,uv-vec2(px.x,0.)).g;float r=texture2D(source,uv+vec2(px.x,0.)).g;float d=texture2D(source,uv-vec2(0.,px.y)).g;float u=texture2D(source,uv+vec2(0.,px.y)).g;float grad=abs(r-l)+abs(u-d);float contour=smoothstep(.006,.06,grad);float bands=smoothstep(.72,.98,abs(sin(v*42.)))*smoothstep(.06,.34,v)*.18;vec3 col=pal(v);float alpha=clamp(contour*.34+bands*.28,0.,.38)*opacity;gl_FragColor=vec4(col,alpha);}
`;

function shader(gl,type,source){const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(value));return value;}
function program(gl,fragment){const value=gl.createProgram();gl.attachShader(value,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(value,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(value);if(!gl.getProgramParameter(value,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(value));return value;}
function makeTarget(gl,size,data){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,data);const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);return{texture,framebuffer};}

export function createFeedback(canvas,{tier='A'}={}){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false}); if(!gl)return null;
 gl.getExtension('OES_standard_derivatives');
 const size=tier==='A'?640:tier==='B'?384:256;
 const update=program(gl,updateFragment); const display=program(gl,displayFragment);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const initial=new Uint8Array(size*size*4);for(let i=0;i<size*size;i++){initial[i*4]=255;initial[i*4+3]=255;} for(let seed=0;seed<26;seed++){const cx=size*(.12+Math.random()*.76),cy=size*(.12+Math.random()*.76),rx=size*(.002+Math.random()*.006),ry=size*(.002+Math.random()*.006);for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(size,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(size,Math.ceil(cx+rx));x++){const dx=(x-cx)/rx,dy=(y-cy)/ry;if(dx*dx+dy*dy<1){const i=(y*size+x)*4;initial[i+1]=210+Math.floor(Math.random()*45);}}}
 let read=makeTarget(gl,size,initial),write=makeTarget(gl,size,null);let active=false,quality=0,energy=0,pointer={x:.5,y:.5},phase=0;
 function bind(programValue){gl.useProgram(programValue);const loc=gl.getAttribLocation(programValue,'p');gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);}
 function resize(){const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(innerWidth*ratio);canvas.height=Math.floor(innerHeight*ratio);}
 resize();addEventListener('resize',resize);
 function step(){phase+=.013; if(active){for(let pass=0;pass<(tier==='A'?5:3);pass++){gl.bindFramebuffer(gl.FRAMEBUFFER,write.framebuffer);gl.viewport(0,0,size,size);bind(update);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,read.texture);gl.uniform1i(gl.getUniformLocation(update,'source'),0);gl.uniform2f(gl.getUniformLocation(update,'px'),1/size,1/size);gl.uniform2f(gl.getUniformLocation(update,'pointer'),pointer.x,pointer.y);gl.uniform1f(gl.getUniformLocation(update,'inject'),energy);const values=quality===0?[.034,.061]:quality===1?[.027,.058]:[.022,.055];gl.uniform1f(gl.getUniformLocation(update,'feed'),values[0]);gl.uniform1f(gl.getUniformLocation(update,'kill'),values[1]);gl.uniform1f(gl.getUniformLocation(update,'phase'),phase);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,6);[read,write]=[write,read];energy*=.91;}}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);bind(display);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,read.texture);gl.uniform1i(gl.getUniformLocation(display,'source'),0);gl.uniform2f(gl.getUniformLocation(display,'px'),1/size,1/size);gl.uniform1f(gl.getUniformLocation(display,'quality'),quality);gl.uniform1f(gl.getUniformLocation(display,'opacity'),active?.82:.0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(step);}
 requestAnimationFrame(step);
 return{activate(value){active=value;},setQuality(value){quality=value;},inject(x,y,value){pointer={x,y:1-y};energy=Math.min(1,energy+value);},getTier(){return tier;},sample(){const pixels=new Uint8Array(size*size*4);gl.bindFramebuffer(gl.FRAMEBUFFER,read.framebuffer);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let maxA=0,maxB=0,sumB=0;for(let i=0;i<pixels.length;i+=4){maxA=Math.max(maxA,pixels[i]);maxB=Math.max(maxB,pixels[i+1]);sumB+=pixels[i+1];}return[maxA,maxB,Math.round(sumB/(size*size))];}};
}

export function detectTier(){const memory=navigator.deviceMemory||4;const mobile=innerWidth<700;const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl');if(!gl)return'C';if(memory>=8&&!mobile&&devicePixelRatio<=2)return'A';return'B';}
