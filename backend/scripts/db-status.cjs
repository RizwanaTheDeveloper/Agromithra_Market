// Prints the effective database target without exposing connection credentials.
require('dotenv').config({path:require('node:path').resolve(__dirname,'../.env'),quiet:true});
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{
  const url=new URL(process.env.DATABASE_URL);
  const [target]=await db.$queryRaw`SELECT current_database() AS database, current_schema() AS schema, inet_server_port() AS port`;
  console.log(JSON.stringify({connection:{host:url.hostname,...target},counts:{users:await db.user.count(),listings:await db.listing.count(),requirements:await db.buyerRequest.count()},latestListings:await db.listing.findMany({take:5,orderBy:{createdAt:'desc'},select:{id:true,title:true,status:true}})},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.$disconnect());
