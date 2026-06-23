import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from dotenv import load_dotenv

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import User, Project, Transcript, Highlight, GeneratedAsset, Job
from app.db import Base

async def migrate():
    # Load env files
    load_dotenv()

    sqlite_url = "sqlite+aiosqlite:///./app.db"
    supabase_url = os.getenv("DATABASE_URL")

    if not supabase_url or "sqlite" in supabase_url:
        print("ERROR: DATABASE_URL in backend/.env is not configured for Supabase/PostgreSQL.")
        print("Please configure DATABASE_URL in backend/.env with your postgresql:// connection string first.")
        return

    # Normalize Supabase URL scheme for asyncpg
    if supabase_url.startswith("postgres://"):
        supabase_url = supabase_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif supabase_url.startswith("postgresql://"):
        supabase_url = supabase_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"Connecting to SQLite database at: {sqlite_url}")
    print(f"Connecting to Supabase PostgreSQL at: {supabase_url.split('@')[-1]}") # Hide passwords

    sqlite_engine = create_async_engine(sqlite_url, echo=False)
    supabase_engine = create_async_engine(supabase_url, echo=False)

    sqlite_session = sessionmaker(sqlite_engine, class_=AsyncSession, expire_on_commit=False)
    supabase_session = sessionmaker(supabase_engine, class_=AsyncSession, expire_on_commit=False)

    async with sqlite_session() as sq_sess, supabase_session() as sb_sess:
        try:
            # 1. Migrate Users
            print("\nMigrating users...")
            users_res = await sq_sess.execute(select(User))
            sqlite_users = users_res.scalars().all()
            for u in sqlite_users:
                new_u = User(
                    id=u.id,
                    email=u.email,
                    name=u.name,
                    avatar_url=u.avatar_url,
                    is_guest=u.is_guest,
                    created_at=u.created_at
                )
                await sb_sess.merge(new_u)
            print(f"Queued {len(sqlite_users)} users.")

            # 2. Migrate Projects
            print("Migrating projects...")
            proj_res = await sq_sess.execute(select(Project))
            sqlite_projects = proj_res.scalars().all()
            for p in sqlite_projects:
                new_p = Project(
                    id=p.id,
                    title=p.title,
                    source_type=p.source_type,
                    source_ref=p.source_ref,
                    status=p.status,
                    default_model_mode=p.default_model_mode,
                    default_pinned_model=p.default_pinned_model,
                    target_assets=p.target_assets,
                    user_id=p.user_id,
                    created_at=p.created_at
                )
                await sb_sess.merge(new_p)
            print(f"Queued {len(sqlite_projects)} projects.")

            # 3. Migrate Transcripts
            print("Migrating transcripts...")
            trans_res = await sq_sess.execute(select(Transcript))
            sqlite_trans = trans_res.scalars().all()
            for t in sqlite_trans:
                new_t = Transcript(
                    id=t.id,
                    project_id=t.project_id,
                    full_text=t.full_text,
                    segments=t.segments
                )
                await sb_sess.merge(new_t)
            print(f"Queued {len(sqlite_trans)} transcripts.")

            # 4. Migrate Highlights
            print("Migrating highlights...")
            high_res = await sq_sess.execute(select(Highlight))
            sqlite_highs = high_res.scalars().all()
            for h in sqlite_highs:
                new_h = Highlight(
                    id=h.id,
                    project_id=h.project_id,
                    start_seconds=h.start_seconds,
                    end_seconds=h.end_seconds,
                    quote=h.quote,
                    reason=h.reason
                )
                await sb_sess.merge(new_h)
            print(f"Queued {len(sqlite_highs)} highlights.")

            # 5. Migrate Generated Assets
            print("Migrating generated assets...")
            asset_res = await sq_sess.execute(select(GeneratedAsset))
            sqlite_assets = asset_res.scalars().all()
            for a in sqlite_assets:
                new_a = GeneratedAsset(
                    id=a.id,
                    project_id=a.project_id,
                    asset_type=a.asset_type,
                    content=a.content,
                    related_highlight_id=a.related_highlight_id,
                    model_used=a.model_used,
                    status=a.status,
                    created_at=a.created_at
                )
                await sb_sess.merge(new_a)
            print(f"Queued {len(sqlite_assets)} generated assets.")

            # 6. Migrate Jobs
            print("Migrating jobs...")
            job_res = await sq_sess.execute(select(Job))
            sqlite_jobs = job_res.scalars().all()
            for j in sqlite_jobs:
                new_j = Job(
                    id=j.id,
                    project_id=j.project_id,
                    stage=j.stage,
                    status=j.status,
                    error_message=j.error_message,
                    model_used=j.model_used,
                    updated_at=j.updated_at
                )
                await sb_sess.merge(new_j)
            print(f"Queued {len(sqlite_jobs)} jobs.")

            # Commit transactions
            print("\nCommitting changes to Supabase...")
            await sb_sess.commit()
            print("Database migration commit completed successfully!")

            # Update PostgreSQL serial sequence keys so subsequent auto-increments work
            print("Resetting PostgreSQL primary key sequences...")
            sequences = [
                ("users", "users_id_seq"),
                ("projects", "projects_id_seq"),
                ("transcripts", "transcripts_id_seq"),
                ("highlights", "highlights_id_seq"),
                ("generated_assets", "generated_assets_id_seq"),
                ("jobs", "jobs_id_seq")
            ]
            for table, seq in sequences:
                query = f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1))"
                await sb_sess.execute(text(query))
            await sb_sess.commit()
            print("Sequences reset successfully!")

        except Exception as e:
            print(f"\nERROR occurred: {e}")
            print("Rolling back database transactions...")
            await sb_sess.rollback()
            raise e

    # Clean up engines
    await sqlite_engine.dispose()
    await supabase_engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
