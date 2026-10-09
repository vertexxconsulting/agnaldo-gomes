import os
import shutil

SRC = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes"
STAGING = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes\_staging"
DEST_BASE = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes"

CONFIG_FILES = [
    ".env.example", ".env.local", "AGENTS.md", "CLAUDE.md", "DOCUMENTATION.md",
    "eslint.config.mjs", "next.config.ts", "next-env.d.ts", "package.json",
    "package-lock.json", "playwright.config.ts", "pnpm-lock.yaml",
    "pnpm-workspace.yaml", "postcss.config.mjs", "README.md", "tsconfig.json",
    "tsconfig.tsbuildinfo", "vercel.json",
]
EXCLUDE_DIRS = {".git", "node_modules", ".next", ".pnpm-store", "scratch"}


def ignore_internal(dirpath, names):
    return [n for n in names if n in EXCLUDE_DIRS]


def copy_dir(subdir, dst):
    src = os.path.join(STAGING, subdir)
    if os.path.isdir(src):
        shutil.copytree(src, dst, dirs_exist_ok=True)
        print(f"  [copy dir] {subdir} -> {os.path.relpath(dst, DEST_BASE)}")


def copy_file(rel, dst):
    src = os.path.join(STAGING, rel)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
        print(f"  [copy file] {rel}")


# ---------------------------------------------------------------- Step 1
print("== Step 1: copiando origem para o staging (sem node_modules/.git/.next) ==")
if os.path.exists(STAGING):
    shutil.rmtree(STAGING)
shutil.copytree(SRC, STAGING, ignore=ignore_internal)
print("Staging pronto.")

# ---------------------------------------------------------------- Step 2
print("\n== Step 2: SQL -> pasta sql/ compartilhada ==")
SQL_ROOT = os.path.join(DEST_BASE, "sql")
os.makedirs(SQL_ROOT, exist_ok=True)
sql_groups = {
    "01_core": "sql_scripts/01_core",
    "02_studio": "sql_scripts/02_studio",
    "03_academy": "sql_scripts/03_academy",
    "04_loja": "sql_scripts/04_loja",
    "05_seeds": "sql_scripts/05_seeds",
}
for group_name, group_dir in sql_groups.items():
    group_src = os.path.join(STAGING, group_dir)
    if os.path.isdir(group_src):
        dst = os.path.join(SQL_ROOT, group_name)
        shutil.copytree(group_src, dst, dirs_exist_ok=True)
        print(f"  [sql] {group_dir}/ -> sql/{group_name}/")

# supabase migrations (compartilhados)
mig_src = os.path.join(STAGING, "supabase/migrations")
if os.path.isdir(mig_src):
    dst = os.path.join(SQL_ROOT, "supabase_migrations")
    shutil.copytree(mig_src, dst, dirs_exist_ok=True)
    print(f"  [sql] supabase/migrations -> sql/supabase_migrations/")

# scripts SQL nao arquivados
for extra in ["scripts/migrate-products-columns.sql", "scripts/crop_hero.py", "scripts/optimize_images.py", "scripts/seed-loja.py"]:
    copy_file(extra, os.path.join(SQL_ROOT, os.path.basename(extra)))


# ---------------------------------------------------------------- Step 3
def build_system(name, items):
    dst = os.path.join(DEST_BASE, name)
    if os.path.exists(dst):
        shutil.rmtree(dst)
    os.makedirs(dst, exist_ok=True)
    print(f"\n== Criando {name} ==")
    for item in items:
        if item["type"] == "dir":
            copy_dir(item["subdir"], os.path.join(dst, item.get("dst", item["subdir"])))
        elif item["type"] == "file":
            copy_file(item["rel"], os.path.join(dst, item.get("dst", item["rel"])))


# ---------------- SITE ----------------
site_items = [
    {"type": "dir", "subdir": "app"},  # entire app, filtered below by subdirs
]
# app subdirs -> copy selectively into app/ of site
site_app_subdir = ["(public)", "studio", "agendamento", "aluno", "admin", "perfil"]
# we'll handle app specially
site_items = []
for d in site_app_subdir:
    site_items.append({"type": "dir", "subdir": os.path.join("app", d)})
site_items += [
    {"type": "dir", "subdir": "components"},
    {"type": "dir", "subdir": "lib"},
    {"type": "dir", "subdir": "docs"},
    {"type": "dir", "subdir": "scripts"},
    {"type": "dir", "subdir": "dados externos"},
    {"type": "dir", "subdir": "public"},
    {"type": "dir", "subdir": "Marcas"},
    {"type": "dir", "subdir": "Cursos"},
    {"type": "dir", "subdir": "Base de Prompts"},
    {"type": "dir", "subdir": "tests"},
]
for f in CONFIG_FILES:
    site_items.append({"type": "file", "rel": f})
build_system("Sistema-Site", site_items)

# ---------------- LOJA ----------------
store_items = [
    {"type": "dir", "subdir": "store"},
    {"type": "dir", "subdir": "app/(shop)"},
    {"type": "dir", "subdir": "app/admin-loja"},
    {"type": "dir", "subdir": "components"},
    {"type": "dir", "subdir": "lib"},
    {"type": "dir", "subdir": "docs"},
    {"type": "dir", "subdir": "scripts"},
    {"type": "dir", "subdir": "dados externos"},
    {"type": "dir", "subdir": "public"},
    {"type": "dir", "subdir": "Marcas"},
    {"type": "dir", "subdir": "Cursos"},
    {"type": "dir", "subdir": "Base de Prompts"},
    {"type": "dir", "subdir": "tests"},
]
for f in CONFIG_FILES:
    store_items.append({"type": "file", "rel": f})
# store-specific files
store_items += [
    {"type": "file", "rel": "store/cartStore.ts", "dst": "store/cartStore.ts"},
    {"type": "file", "rel": "lib/loja-settings.ts"},
    {"type": "file", "rel": "lib/shop-queries.ts"},
    {"type": "file", "rel": "lib/shop-mock.ts"},
    {"type": "file", "rel": "components/AddToBasketButton.tsx"},
]
build_system("Sistema-Loja", store_items)

# ---------------- ACADEMY ----------------
academy_items = [
    {"type": "dir", "subdir": "app/academy"},
    {"type": "dir", "subdir": "app/admin-academy"},
    {"type": "dir", "subdir": "app/aluno"},
    {"type": "dir", "subdir": "components"},
    {"type": "dir", "subdir": "lib"},
    {"type": "dir", "subdir": "docs"},
    {"type": "dir", "subdir": "scripts"},
    {"type": "dir", "subdir": "dados externos"},
    {"type": "dir", "subdir": "public"},
    {"type": "dir", "subdir": "Marcas"},
    {"type": "dir", "subdir": "Cursos"},
    {"type": "dir", "subdir": "Base de Prompts"},
    {"type": "dir", "subdir": "tests"},
]
for f in CONFIG_FILES:
    academy_items.append({"type": "file", "rel": f})
academy_items += [
    {"type": "dir", "subdir": "components/academy"},
    {"type": "file", "rel": "lib/pagamentos-academy.ts"},
    {"type": "file", "rel": "lib/curso-checkout-types.ts"},
    {"type": "file", "rel": "lib/curso-types.ts"},
    {"type": "file", "rel": "components/AcademyCheckout.tsx"},
    {"type": "file", "rel": "components/LessonPlayer.tsx"},
]
build_system("Sistema-Academy", academy_items)

# ---------------------------------------------------------------- Step 4
print("\n== Step 4: reestruturando admin/ dentro de cada sistema ==")
# Site: app/admin -> admin/
src = os.path.join(DEST_BASE, "Sistema-Site", "app", "admin")
dst = os.path.join(DEST_BASE, "Sistema-Site", "admin")
if os.path.isdir(src):
    shutil.move(src, dst)
    print(f"  Site: app/admin -> admin/")

# Store: app/admin-loja -> admin/
src = os.path.join(DEST_BASE, "Sistema-Loja", "app", "admin-loja")
dst = os.path.join(DEST_BASE, "Sistema-Loja", "admin")
if os.path.isdir(src):
    shutil.move(src, dst)
    print(f"  Loja: app/admin-loja -> admin/")

# Academy: app/admin-academy -> admin/
src = os.path.join(DEST_BASE, "Sistema-Academy", "app", "admin-academy")
dst = os.path.join(DEST_BASE, "Sistema-Academy", "admin")
if os.path.isdir(src):
    shutil.move(src, dst)
    print(f"  Academy: app/admin-academy -> admin/")

# move app/(shop) -> app/ loja (já ficou na pasta loja, manter)
# move app/(public), app/studio, app/agendamento, app/aluno, app/perfil -> ja estao na pasta site
# move acad: app/aluno -> nao mover (fica na academy, ok)

# remove staging vazio restante
if os.path.exists(STAGING):
    shutil.rmtree(STAGING)
    print("\n  Limpo staging.")

# ---------------------------------------------------------------- Summary
print("\n== Resumo final ==")
for name in ["Sistema-Site", "Sistema-Loja", "Sistema-Academy"]:
    p = os.path.join(DEST_BASE, name)
    if os.path.isdir(p):
        n = sum(len(fs) for _, _, fs in os.walk(p))
        print(f"  {name}/ -> {n} arquivos (incl. node_modules se houver)")

print(f"\n  sql/ compartilhado -> {os.path.join(DEST_BASE, 'sql')}")
print("\nPronto.")
