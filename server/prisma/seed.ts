import { PrismaClient, Role, TaskStatus, Priority, ActivityType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
const days = (n: number) => new Date(Date.now() + n * 86400000);
async function main() {
  await db.activity.deleteMany(); await db.notification.deleteMany(); await db.task.deleteMany(); await db.project.deleteMany(); await db.client.deleteMany(); await db.refreshToken.deleteMany(); await db.user.deleteMany();
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await db.user.create({data:{name:'Aarav Mehta',email:'admin@velozity.dev',passwordHash,role:Role.ADMIN}});
  const pm1 = await db.user.create({data:{name:'Ravi Sharma',email:'ravi@velozity.dev',passwordHash,role:Role.PM}});
  const pm2 = await db.user.create({data:{name:'Maya Patel',email:'maya@velozity.dev',passwordHash,role:Role.PM}});
  const devs = await Promise.all(['Ishaan Rao','Nisha Kapoor','Arjun Singh','Zoya Khan'].map((name,i)=>db.user.create({data:{name,email:`dev${i+1}@velozity.dev`,passwordHash,role:Role.DEVELOPER}})));
  const clients = await Promise.all([['Northstar Health','Healthcare'],['Lumen Retail','Retail'],['Arc Studio','Design']].map(([name,industry])=>db.client.create({data:{name,industry}})));
  const projectDefs = [['Northstar patient portal','A patient-first scheduling platform',pm1.id,clients[0].id],['Lumen commerce refresh','A faster storefront for a modern retailer',pm1.id,clients[1].id],['Arc brand system','A shared design system and asset library',pm2.id,clients[2].id]] as const;
  const statuses = [TaskStatus.TODO,TaskStatus.IN_PROGRESS,TaskStatus.IN_REVIEW,TaskStatus.DONE,TaskStatus.OVERDUE]; const priorities = [Priority.CRITICAL,Priority.HIGH,Priority.MEDIUM,Priority.LOW,Priority.HIGH];
  for (let p=0;p<projectDefs.length;p++) { const [name,description,ownerId,clientId]=projectDefs[p]; const project=await db.project.create({data:{name,description,ownerId,clientId}}); for(let i=0;i<5;i++){ const status=statuses[(i+p)%statuses.length]; const task=await db.task.create({data:{title:['Authentication flow','Dashboard analytics','Mobile QA pass','Client handoff','Release checklist'][i],description:'Keep the delivery moving with a clear, reviewable outcome.',projectId:project.id,developerId:devs[(i+p)%devs.length].id,status,priority:priorities[i],dueDate:status===TaskStatus.OVERDUE?days(-3):days(i+1)}}); await db.activity.create({data:{type:ActivityType.TASK_CREATED,message:`Task #${task.id} was added to ${project.name}`,taskId:task.id,projectId:project.id,actorId:ownerId,createdAt:days(-i-1)}}); if(status!==TaskStatus.TODO) await db.activity.create({data:{type:ActivityType.STATUS_CHANGE,message:`Task #${task.id} moved to ${status.replace('_',' ')}`,fromStatus:TaskStatus.TODO,toStatus:status,taskId:task.id,projectId:project.id,actorId:ownerId,createdAt:days(-i)}}); } }
  await db.notification.create({data:{userId:devs[0].id,message:'You have been assigned Authentication flow'}});
  console.log('Seeded demo users. Password for all: password123');
}
main().finally(()=>db.$disconnect());
