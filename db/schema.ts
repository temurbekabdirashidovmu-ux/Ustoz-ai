import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core";
export const settings=sqliteTable("site_settings",{id:text("id").primaryKey(),value:text("value").notNull()});
export const usage=sqliteTable("daily_usage",{day:text("day").primaryKey(),count:integer("count").notNull().default(0)});
export const books=sqliteTable('books',{
 id:text('id').primaryKey(), title:text('title').notNull(), author:text('author').notNull(),
 language:text('language').notNull().default('uz'), category:text('category').notNull().default('Boshqa'),
 description:text('description').notNull().default(''), source:text('source').notNull().default(''),
 status:text('status').notNull().default('published'), objectKey:text('object_key').notNull(),
 hash:text('hash').notNull().unique(), size:integer('size').notNull(), originalName:text('original_name').notNull(),
 searchText:text('search_text').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const pilotAttempts=sqliteTable('pilot_attempts',{
 id:text('id').primaryKey(),preScore:integer('pre_score').notNull(),postScore:integer('post_score').notNull(),rating:integer('rating').notNull(),createdAt:text('created_at').notNull()
});
export const adminMembers=sqliteTable('admin_members',{
 email:text('email').primaryKey(),userId:text('user_id'),active:integer('active').notNull().default(1),createdBy:text('created_by').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),lastSeenAt:text('last_seen_at')
});
export const adminAudit=sqliteTable('admin_audit',{
 id:text('id').primaryKey(),actorId:text('actor_id').notNull(),actorEmail:text('actor_email').notNull(),action:text('action').notNull(),targetId:text('target_id').notNull(),label:text('label').notNull(),createdAt:text('created_at').notNull()
});
export const studentProfiles=sqliteTable('student_profiles',{userId:text('user_id').primaryKey(),email:text('email').notNull(),username:text('username').notNull().unique(),createdAt:text('created_at').notNull(),lastSeenAt:text('last_seen_at').notNull()});
export const studentScores=sqliteTable('student_scores',{userId:text('user_id').primaryKey(),bestScore:integer('best_score').notNull().default(0),attempts:integer('attempts').notNull().default(0),achievedAt:text('achieved_at'),updatedAt:text('updated_at').notNull()});
export const quizRuns=sqliteTable('quiz_runs',{id:text('id').primaryKey(),userId:text('user_id').notNull(),questions:text('questions').notNull(),answers:text('answers').notNull(),startedAt:text('started_at').notNull(),expiresAt:text('expires_at').notNull(),finishedAt:text('finished_at'),score:integer('score')});
