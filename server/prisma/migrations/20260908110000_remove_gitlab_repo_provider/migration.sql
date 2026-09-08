-- Drop GitLab from RepoProvider. Postgres cannot remove a single enum value
-- in place, so recreate the type as GitHub-only after deleting any gitlab rows.

DELETE FROM "ConnectedRepo" WHERE "provider" = 'gitlab';

CREATE TYPE "RepoProvider_new" AS ENUM ('github');

ALTER TABLE "ConnectedRepo"
  ALTER COLUMN "provider" TYPE "RepoProvider_new"
  USING ("provider"::text::"RepoProvider_new");

DROP TYPE "RepoProvider";

ALTER TYPE "RepoProvider_new" RENAME TO "RepoProvider";
