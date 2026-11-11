/* One shared, offline KTX2 loader with one worker and no CDN. */
(()=>{
window.SentinelLoadHullTexture=async(renderer)=>{
 const T=window.SentinelTHREE,A=window.SentinelKTXAssets;if(!T||!A||!window.SentinelKTX2Loader)return null;
 const manager=new T.LoadingManager();manager.setURLModifier(url=>url.endsWith('basis_transcoder.js')?A.js:url.endsWith('basis_transcoder.wasm')?A.wasm:url);
 const loader=new window.SentinelKTX2Loader(manager).setTranscoderPath('embedded/').setWorkerLimit(1);loader.detectSupport(renderer);
 try{const data=Uint8Array.from(atob(A.hull),c=>c.charCodeAt(0));const texture=await loader.parse(data.buffer);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(2,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;return texture}finally{loader.dispose()}
};
})();
