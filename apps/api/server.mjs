import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";
const {Pool}=pg;

const port=Number(process.env.PORT||4000);
const TELEGRAM_MAX_AGE=Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE||86400);
const BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const DATABASE_URL=process.env.DATABASE_URL||"";
const pool=DATABASE_URL?new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}}):null;
const MINIAPP=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../miniapp");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp"};
async function serveMiniApp(req,res){
 const pathname=new URL(req.url,"http://localhost").pathname;
 const rel=pathname==="/"?"index.html":pathname.replace(/^\/+/,"");
 if(rel.startsWith("api/"))return false;
 const safe=path.resolve(MINIAPP,rel);
 if(!safe.startsWith(MINIAPP))return false;
 try{const file=await fs.readFile(safe);res.writeHead(200,{"content-type":mime[path.extname(safe)]||"application/octet-stream","cache-control":"no-cache"});res.end(file);return true;}catch{}
 if(pathname==="/")return false;
 try{const file=await fs.readFile(path.join(MINIAPP,"index.html"));res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-cache"});res.end(file);return true;}catch{return false;}
}
const sessions=new Map();

const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-allow-headers":"content-type, x-telegram-init-data, authorization","access-control-allow-methods":"GET,POST,OPTIONS"});res.end(JSON.stringify(data));};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{};};

function telegramUser(initData){
 if(!initData)return null;
 const p=new URLSearchParams(initData),raw=p.get("user"); if(!raw)return null;
 try{
  const user=JSON.parse(raw);
  const authDate=Number(p.get("auth_date")||0);
  if(authDate && Date.now()/1000-authDate>TELEGRAM_MAX_AGE) return null;
  if(!BOT_TOKEN)return user;
  const hash=p.get("hash")||""; p.delete("hash");
  const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n");
  const secret=crypto.createHmac("sha256","WebAppData").update(BOT_TOKEN).digest();
  const expected=crypto.createHmac("sha256",secret).update(data).digest("hex");
  if(hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))return null;
  return user;
 }catch{return null}
}
function auth(req){const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");return sessions.get(token)||null;}
function defaultProfile(user){return {telegramId:String(user.id),name:user.first_name||"Алекс",goal:"Сила и форма",level:"Средний",days:4,equipment:"Зал",weight:82,streak:0,completed:0,ready:87};}
async function nextMove(p){
 let recent=0,lastExercise="";
 if(pool){
  const q=await pool.query("SELECT COUNT(*)::int AS count, MAX(started_at) AS last_started FROM workout_sessions WHERE telegram_id=$1 AND started_at>now()-interval '7 days'",[p.telegramId]);
  recent=q.rows[0]?.count||0;
  const e=await pool.query("SELECT exercise FROM workout_sessions WHERE telegram_id=$1 ORDER BY started_at DESC LIMIT 1",[p.telegramId]);
  lastExercise=e.rows[0]?.exercise||"";
 } 
 const recovery=p.ready>=80?"Хорошее восстановление":p.ready>=60?"Умеренное восстановление":"Нужен более лёгкий день";
 let title=p.goal==="Снижение веса"?"Full body + кондиция":p.goal==="Выносливость"?"Кардио + интервалы":"Грудь + плечи";
 if(recent>=p.days) title="Recovery / Mobility";
 return {title,duration:title==="Recovery / Mobility"?25:(p.goal==="Выносливость"?42:48),type:title==="Recovery / Mobility"?"recovery":"strength",recommendation:recent>=p.days?"снизить нагрузку и восстановиться":p.completed>=8?"+1 подход к ключевому упражнению":"базовая силовая сессия",reasons:[recovery,lastExercise?"Последняя тренировка: "+lastExercise:"История нагрузки уже учитывается","Цель: "+p.goal]};
}
async function dbProfile(user){
 if(!pool)return defaultProfile(user);
 const r=await pool.query("SELECT telegram_id AS \"telegramId\",name,goal,level,days,equipment,weight,streak,completed,ready FROM profiles WHERE telegram_id=$1",[String(user.id)]);
 if(r.rowCount)return r.rows[0];
 const p=defaultProfile(user);
 await pool.query("INSERT INTO users(telegram_id,first_name,username) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[p.telegramId,p.name,user.username||null]);
 await pool.query("INSERT INTO profiles(telegram_id,name,goal,level,days,equipment,weight,ready,streak,completed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[p.telegramId,p.name,p.goal,p.level,p.days,p.equipment,p.weight,p.ready,p.streak,p.completed]);
 return p;
}
async function saveProfile(p){
 if(!pool)return;
 await pool.query("UPDATE profiles SET name=$2,goal=$3,level=$4,days=$5,equipment=$6,weight=$7,ready=$8,streak=$9,completed=$10,updated_at=now() WHERE telegram_id=$1",[p.telegramId,p.name,p.goal,p.level,p.days,p.equipment,p.weight,p.ready,p.streak,p.completed]);
}
async function getUser(req){const s=auth(req);return s?dbProfile(s.user):null;}

const server=http.createServer(async(req,res)=>{
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}
 try{
  if(req.method==="GET"&&req.url==="/health"){
   let db="disabled"; if(pool){await pool.query("SELECT 1");db="connected";}
   return json(res,200,{ok:true,service:"torclix-fit-api",version:"0.5.0",storage:pool?"neon-postgres":"memory",database:db});
  }
  if(req.method==="GET"&&await serveMiniApp(req,res))return;
  if(req.method==="POST"&&req.url==="/api/auth/telegram"){
   const user=telegramUser(req.headers["x-telegram-init-data"]);
   if(!user&&BOT_TOKEN)return json(res,401,{ok:false,error:"Invalid Telegram initData"});
   const safe=user||{id:"demo",first_name:"Демо"};
   const profile=await dbProfile(safe);
   const token=crypto.randomUUID(); sessions.set(token,{user:safe,createdAt:Date.now()});
   return json(res,200,{ok:true,token,user:safe,profile,nextMove:await nextMove(profile)});
  }
  if(req.url==="/api/profile"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,profile:p});}
  if(req.url==="/api/profile"&&req.method==="POST"){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);
   Object.assign(p,{name:String(b.name||p.name).slice(0,60),goal:String(b.goal||p.goal),level:String(b.level||p.level),days:Math.min(7,Math.max(1,Number(b.days||p.days))),equipment:String(b.equipment||p.equipment)});
   await saveProfile(p);return json(res,200,{ok:true,profile:p,nextMove:await nextMove(p)});
  }
  if(req.url==="/api/today"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,ready:p.ready,nextMove:await nextMove(p),profile:p,generatedAt:new Date().toISOString()});}
  if(req.url==="/api/workouts/history"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});if(!pool)return json(res,200,{ok:true,sessions:[]});const q=await pool.query("SELECT id,exercise,status,started_at,finished_at FROM workout_sessions WHERE telegram_id=$1 ORDER BY started_at DESC LIMIT 30",[p.telegramId]);return json(res,200,{ok:true,sessions:q.rows});}
  if(req.url==="/api/fitness-twin"&&req.method==="GET"){const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});return json(res,200,{ok:true,strength:74+Math.min(12,p.completed),endurance:68,recovery:81,mobility:62,consistency:Math.min(100,76+p.completed)});}
  if(req.method==="POST"&&req.url==="/api/workouts/sessions"){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);const id=crypto.randomUUID();
   if(pool)await pool.query("INSERT INTO workout_sessions(id,telegram_id,exercise,status,started_at) VALUES($1,$2,$3,'active',now())",[id,p.telegramId,b.exercise||"Жим штанги лёжа"]);
   else sessions.set("workout:"+id,{id,userId:p.telegramId,exercise:b.exercise||"Жим штанги лёжа",sets:[]});
   return json(res,201,{ok:true,session:{id,exercise:b.exercise||"Жим штанги лёжа",status:"active"}});
  }
  const m=req.url.match(/^\/api\/workouts\/sessions\/([^/]+)\/sets$/);
  if(req.method==="POST"&&m){
   const p=await getUser(req);if(!p)return json(res,401,{ok:false,error:"Unauthorized"});const b=await body(req);
   if(pool){
    const q=await pool.query("SELECT id FROM workout_sessions WHERE id=$1 AND telegram_id=$2",[m[1],p.telegramId]);if(!q.rowCount)return json(res,404,{ok:false,error:"Session not found"});
    const id=crypto.randomUUID();await pool.query("INSERT INTO workout_sets(id,session_id,weight,reps,rpe,saved_at) VALUES($1,$2,$3,$4,$5,now())",[id,m[1],Number(b.weight||0),Number(b.reps||0),Number(b.rpe||0)]);
   }else{const s=sessions.get("workout:"+m[1]);if(!s||s.userId!==p.telegramId)return json(res,404,{ok:false,error:"Session not found"});s.sets.push(b);}
   p.completed+=1;p.streak=Math.max(1,p.streak+1);await saveProfile(p);return json(res,201,{ok:true,profile:p,nextMove:await nextMove(p)});
  }
  return json(res,404,{ok:false,error:"Not found"});
 }catch(error){console.error(error);return json(res,500,{ok:false,error:"Internal server error"});}
});
server.listen(port,()=>console.log("TORCLIX FIT API listening on "+port));