import os
import shutil

ORIG = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes"
DEST = r"C:\Users\Cassi\OneDrive\Documentos\Anderson"

SQL_GROUPS = ["01_core", "02_studio", "03_academy", "04_loja", "05_seeds"]


def ensure(name, subdirs, extra_files):
    dst = os.path.join(DEST, name)
    if os.path.exists(dst):
        shutil.rmtree(dst)
    os.makedirs(dst, exist_ok=True)
    for src, dst_rel in subdirs:
        s = os.path.join(ORIG, src)
        d = os.path.join(dst, dst_rel)
        if not os.path.exists(s):
            print(f"  [WARN] {src} nao encontrado")
            continue
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(s, d)
    for f in extra_files:
        s = os.path.join(ORIG, f)
        if os.path.isfile(s):
            shutil.copy2(s, os.path.join(dst, f))
    os.makedirs(os.path.join(dst, "sql"), exist_ok=True)
    for g in SQL_GROUPS:
        s = os.path.join(ORIG, "sql_scripts", g)
        d = os.path.join(dst, "sql", g)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
    s = os.path.join(ORIG, "supabase/migrations")
    d = os.path.join(dst, "sql", "supabase_migrations")
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
    print(f"  criado {name}/")

    admin = os.path.join(dst, "admin")
    n_admin = sum(len(fs) for _, _, fs in os.walk(admin)) if os.path.isdir(admin) else 0
    n_sql = sum(len(fs) for _, _, fs in os.walk(os.path.join(dst, "sql"))) if os.path.isdir(os.path.join(dst, "sql")) else 0
    print(f"        admin/pages: {n_admin} | sql/files: {n_sql}")


def main():
    # Apenas remove os sistemas e sql/ já criados no Anderson/, NUNCA o diretorio
    # pai (que contem .git bloqueado pelo Windows/OneDrive).
    for name in ["Sistema-Site", "Sistema-Loja", "Sistema-Academy"]:
        p = os.path.join(DEST, name)
        if os.path.exists(p):
            shutil.rmtree(p)
            print(f"  [clean] removido {name}/")
    sql = os.path.join(DEST, "sql")
    if os.path.exists(sql):
        shutil.rmtree(sql)
        print(f"  [clean] removido sql/")

    ensure("Sistema-Site", [
        ("app/(public)", "app/(public)"),
        ("app/agendamento", "app/agendamento"),
        ("app/aluno", "app/aluno"),
        ("app/perfil", "app/perfil"),
        ("app/admin", "admin"),
        ("app/admin-secretaria", "app/admin-secretaria"),
        ("components", "components"),
        ("lib", "lib"),
        ("docs", "docs"),
        ("scripts", "scripts"),
        ("dados externos", "dados externos"),
        ("public", "public"),
        ("Marcas", "Marcas"),
        ("Cursos", "Cursos"),
        ("Base de Prompts", "Base de Prompts"),
        ("tests", "tests"),
    ], [])

    ensure("Sistema-Loja", [
        ("store", "store"),
        ("app/(shop)", "app/(shop)"),
        ("app/admin-loja", "admin"),
        ("components", "components"),
        ("lib", "lib"),
        ("docs", "docs"),
        ("scripts", "scripts"),
        ("dados externos", "dados externos"),
        ("public", "public"),
        ("Marcas", "Marcas"),
        ("Cursos", "Cursos"),
        ("Base de Prompts", "Base de Prompts"),
        ("tests", "tests"),
    ], [])

    ensure("Sistema-Academy", [
        ("app/academy", "app/academy"),
        ("app/admin-academy", "admin"),
        ("app/aluno", "app/aluno"),
        ("components", "components"),
        ("lib", "lib"),
        ("docs", "docs"),
        ("scripts", "scripts"),
        ("dados externos", "dados externos"),
        ("public", "public"),
        ("Marcas", "Marcas"),
        ("Cursos", "Cursos"),
        ("Base de Prompts", "Base de Prompts"),
        ("tests", "tests"),
    ], [])

    print("\n== VERIFICATION FINAL ==")
    for name in ["Sistema-Site", "Sistema-Loja", "Sistema-Academy"]:
        p = os.path.join(DEST, name)
        admin = os.path.join(p, "admin")
        sql = os.path.join(p, "sql")
        n_admin = sum(len(fs) for _, _, fs in os.walk(admin)) if os.path.isdir(admin) else 0
        n_sql = sum(len(fs) for _, _, fs in os.walk(sql)) if os.path.isdir(sql) else 0
        ok = os.path.isfile(os.path.join(admin, "page.tsx"))
        print(f"  {name}/  admin/page.tsx: {'OK' if ok else 'NO'}  admin/pages={n_admin}  sql/files={n_sql}")

    print("\n== ORIGINAL AGNaldo Gomes/ INTACTO? ==")
    print(f"  app/ inalterado: {sum(1 for _ in os.listdir(ORIG) if os.path.isdir(os.path.join(ORIG,'app'))) > 0}")
    print(f"  sql_scripts no original: {'SIM' if os.path.isdir(os.path.join(ORIG,'sql_scripts')) else 'NAO'}")


if __name__ == "__main__":
    main()
