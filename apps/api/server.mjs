import http from "node:http";

const port=Number(process.env.PORT||4000);
const json=(res,status,data)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"});
  res.end(JSON.stringify(data));
};

const server=http.createServer((req,res)=>{
  if(req.method==="GET"&&req.url==="/health") return json(res,200,{ok:true,service:"torclix-fit-api",version:"0.1.0"});
  if(req.method==="GET"&&req.url==="/api/today") return json(res,200,{ready:87,nextMove:{title:"Грудь + плечи",duration:48,type:"strength"},reasons:["Сон 8ч 12м","Хорошее восстановление","Верх тела не нагружался 2 дня"]});
  if(req.method==="GET"&&req.url==="/api/fitness-twin") return json(res,200,{strength:74,endurance:68,mobility:62,recovery:81});
  return json(res,404,{ok:false,error:"Not found"});
});

server.listen(port,()=>console.log("TORCLIX FIT API listening on "+port));