import {randomUUID} from 'node:crypto';
export function installReports(app,express,{recipient=process.env.REPORT_EMAIL,send=fetch,now=Date.now}={}) {
 const attempts=new Map();let windowStart=now(),total=0;
 app.post('/api/reports',express.json({limit:'8kb'}),async(req,res)=>{
  const origin=req.get('origin');if(origin&&origin!==`${req.protocol}://${req.get('host')}`&&origin!==`https://${req.get('host')}`)return res.status(403).json({error:'Open the report form on the game website.'});
  if(!recipient)return res.status(503).json({error:'Report email is not configured yet.'});
  const b=req.body||{};const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
  const category=clean(b.category,20),description=clean(b.description,2000),player=clean(b.player,80),room=clean(b.room,80);
  if(!['bug','player','feedback'].includes(category)||description.length<10)return res.status(400).json({error:'Choose a category and describe the issue in at least 10 characters.'});
  if(b.website)return res.status(400).json({error:'Unable to submit.'});
  const t=now();if(t-windowStart>=3600000){total=0;windowStart=t}for(const [key,stamp] of attempts)if(t-stamp>=600000)attempts.delete(key);
  // Render appends the client address to X-Forwarded-For. Use the last hop, not caller-provided first entries.
  const ip=(req.get('x-forwarded-for')||req.socket.remoteAddress||'unknown').split(',').at(-1).trim();
  if(attempts.has(ip)||total>=100)return res.status(429).json({error:'Please wait before sending another report.'});
  attempts.set(ip,t);total++;
  const id=randomUUID();
  try{
   const upstream=await send('https://formsubmit.co/ajax/'+encodeURIComponent(recipient),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Referer:'https://sentinel-frontier-tareq.onrender.com/'},body:JSON.stringify({_subject:`Sentinel Frontier ${category} report`,_template:'table',report_id:id,category,player:player||'Not specified',room:room||'Not specified',description,version:'3.8',submitted_at:new Date(t).toISOString()}),signal:AbortSignal.timeout(15000)});
   const raw=await upstream.text();let data;try{data=JSON.parse(raw)}catch{console.warn('Report relay non-JSON response',upstream.status,raw.slice(0,180));throw Error('non-JSON')}if(data.success!==true&&data.success!=='true')console.warn('Report relay response',upstream.status,String(data.message||'').slice(0,220));
   if(/activat|confirm.*email/i.test(data.message||''))return res.status(202).json({status:'pending_activation',id,message:'Report submitted for processing. The game owner must activate email delivery before reports can arrive.'});
   if(!upstream.ok||!(data.success===true||data.success==='true'))throw Error('delivery refused');
   res.json({status:'accepted',id,message:'Report accepted by the email service. Thank you!'});
  }catch(error){console.warn('Report relay failed',error.name,error.cause?.code||error.message);attempts.delete(ip);res.status(502).json({error:'Email service unavailable. Your report was not confirmed; please try again later.'})}
 });
}
