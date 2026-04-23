# Cleanup — after unzipping this archive

If you're unzipping over an existing folder, a few files were **removed**
in this version but `unzip` cannot delete them for you. Delete them by
hand before committing:

## Files to delete if they exist in your local copy

- `components/FeaturedPros.tsx` — replaced by `app/pros/page.tsx` and
  `components/ProsBrowser.tsx`. If this file still exists, you'll get
  a TypeScript error at build time:
  `Module '"@/lib/pros"' has no exported member 'PRO_PLAYERS'`

## One-command cleanup

From your repo root:

```bash
rm -f components/FeaturedPros.tsx
git add -A
git status    # should show 'deleted: components/FeaturedPros.tsx'
git commit -m "Remove stale FeaturedPros.tsx"
git push
```

## Why this happens

`unzip` only writes files from the archive. It never deletes files
that already exist at the target path. When a file is removed between
versions, you have to delete it manually.

## Cleanest approach for future updates

Unzip into a **fresh folder**, then copy your `.git` directory over,
then `git add -A && git commit` — which automatically stages both new
files and deletions:

```bash
mv my-project my-project-old
unzip <new-zip>.zip -d my-project
cd my-project
cp -r ../my-project-old/.git .
git add -A
git commit -m "Sync from zip"
git push
```
