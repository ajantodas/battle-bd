const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(PUB,path.normalize(u));
if(!f.startsWith(PUB)){res.writeHead(403);return res.end()}
fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});
const wss=new WebSocketServer({server}),rooms=new Map(),ZC=[[11,19],[-112,54],[-170,-37],[-75,118],[10,-75]];let nid=0;
const tx=(ws,o)=>{if(ws.readyState===1)ws.send(JSON.stringify(o))};
const all=(r,o)=>{const s=JSON.stringify(o);for(const p of r.ps.values())if(p.ws.readyState===1)p.ws.send(s)};
const plist=r=>[...r.ps.values()].map(p=>({id:p.id,name:p.name}));
const living=r=>[...r.ps.values()].filter(p=>p.alive);
function start(r){r.phase='play';const z=ZC[Math.random()*ZC.length|0];r.zone={x:z[0],z:z[1],t0:Date.now()};r.n0=r.ps.size;
for(const p of r.ps.values()){p.hp=100;p.alive=true;p.k=0;p.x=0;p.y=-50;p.z=0}all(r,{t:'start',zx:z[0],zz:z[1]})}
function check(r){if(r.phase!=='play')return;const al=living(r);
if((r.n0>=2&&al.length<=1)||(r.n0<2&&al.length===0)){r.phase='over';const w=al[0];all(r,{t:'end',w:w?w.id:0,wn:w?w.name:'Nobody',k:w?w.k:0});
setTimeout(()=>{if(rooms.get(r.code)!==r)return;r.phase='lobby';for(const p of r.ps.values()){p.alive=false;p.hp=0}all(r,{t:'lobby',host:r.host,players:plist(r)})},8000)}}
function kill(r,v,k){v.hp=0;v.alive=false;const rank=living(r).length+1;if(k&&k!==v)k.k++;all(r,{t:'kill',v:v.id,vn:v.name,k:k?k.id:0,kn:k?k.name:'Zone',rank});check(r)}
wss.on('connection',ws=>{let me=null,room=null;
ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
if(m.t==='join'&&!me){const code=String(m.room||'main').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,16)||'main';
room=rooms.get(code);if(!room){room={code,ps:new Map(),phase:'lobby',host:0,zone:{x:0,z:0,t0:0},n0:0};rooms.set(code,room)}
if(room.ps.size>=8){tx(ws,{t:'err',msg:'Room full (max 8)'});return ws.close()}
me={id:++nid,ws,name:String(m.name||'Player').replace(/[<>]/g,'').slice(0,12)||'Player',x:0,y:-50,z:0,yaw:0,hp:0,alive:false,k:0,lh:0};
room.ps.set(me.id,me);if(!room.host||!room.ps.has(room.host))room.host=me.id;
tx(ws,{t:'welcome',id:me.id,host:room.host,phase:room.phase,zx:room.zone.x,zz:room.zone.z,players:plist(room)});
all(room,{t:room.phase==='lobby'?'lobby':'names',host:room.host,players:plist(room)});return}
if(!me||!room)return;
if(m.t==='s'){if(room.phase==='play'&&me.alive){me.x=+m.x||0;me.y=+m.y||0;me.z=+m.z||0;me.yaw=+m.yaw||0}}
else if(m.t==='shot'){const s=JSON.stringify({t:'shot',id:me.id,ex:m.ex,ey:m.ey,ez:m.ez});for(const p of room.ps.values())if(p!==me&&p.ws.readyState===1)p.ws.send(s)}
else if(m.t==='hit'){const v=room.ps.get(m.id),now=Date.now();if(room.phase!=='play'||!me.alive||!v||!v.alive||v===me||now-me.lh<70)return;
if(Math.hypot(v.x-me.x,v.z-me.z)>180)return;me.lh=now;v.hp-=24;if(v.hp<=0)kill(room,v,me)}
else if(m.t==='start'&&room.host===me.id&&room.phase==='lobby')start(room)});
ws.on('close',()=>{if(!me||!room)return;room.ps.delete(me.id);if(!room.ps.size){rooms.delete(room.code);return}
if(room.host===me.id)room.host=room.ps.keys().next().value;all(room,{t:room.phase==='lobby'?'lobby':'names',host:room.host,players:plist(room)});check(room)})});
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){if(r.phase!=='play')continue;const zr=Math.max(28,420*(1-(now-r.zone.t0)/1000/220));
for(const p of [...r.ps.values()])if(p.alive&&p.y>-40&&Math.hypot(p.x-r.zone.x,p.z-r.zone.z)>zr){p.hp-=3.5*.066;if(p.hp<=0)kill(r,p,null)}
all(r,{t:'snap',zx:r.zone.x,zz:r.zone.z,r:zr,n:living(r).length,ps:[...r.ps.values()].map(p=>({id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,hp:Math.max(0,Math.round(p.hp)),a:p.alive?1:0,k:p.k}))})}},66);
setInterval(()=>wss.clients.forEach(c=>{try{c.ping()}catch(e){}}),25000);
server.listen(PORT,()=>console.log('Battle BD running on :'+PORT));
