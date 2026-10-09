import os
import shutil

ORIG = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes"
TMP = r"C:\Users\Cassi\OneDrive\Documentos\Anderson\_tmp_rebuild"
DEST = r"C:\Users\Cassi\OneDrive\Documentos\Anderson"

SITEMAP = {
    "Sistema-Site": [
        ("app/(public)", "app/(public)"),
        ("app/admin", "admin"),
        ("app/agendamento", "app/agendamento"),
        ("app/aluno", "app/aluno"),
        ("app/perfil", "app/perfil"),
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
    ],
    "Sistema-Loja": [
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
    ],
    "Sistema-Academy": [
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
    ],
}
SQL_GROUPS = ["01_core", "02_studio", "03_academy", "04_loja", "05_seeds"]


def safe_copy(src, dst):
    s = os.path.join(ORIG, src)
    d = os.path.join(DEST, dst)
    if not os.path.exists(s):
        print(f"  [WARN] {src} nao encontrado")
        return
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
        print(f"  [dir]  {src} -> {dst}/")
    else:
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(s, d)
        print(f"  [file] {src} -> {dst}")


def main():
    # 1. clean tmp
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP, exist_ok=True)
    print(f"tmp preparado: {TMP}")

    # 2. SQL x 3 sistemas
    print("\n== SQL x3 sistemas ==")
    for name in SITEMAP:
        base = os.path.join(TMP, name, "sql")
        os.makedirs(base, exist_ok=True)
        for g in SQL_GROUPS:
            safe_copy(os.path.join("sql_scripts", g), os.path.join("sql", g))
        safe_copy(os.path.join("supabase/migrations"), os.path.join("sql", "supabase_migrations"))

    # 3. Sistemas
    print("\n== Sistemas ==")
    for name, items in SITEMAP.items():
        for src, dst in items:
            safe_copy(src, dst)

    # 4. Move para Anderson/
    print("\n== Movendo para Anderson/ ==")
    if os.path.exists(DEST):
        shutil.rmtree(DEST)
    os.makedirs(DEST, exist_ok=True)
    for name in SITEMAP:
        src = os.path.join(TMP, name)
        dst = os.path.join(DEST, name)
        shutil.move(src, dst)
        print(f"  [mv] {name}/ -> {name}/")

    # 5. clean tmp
    shutil.rmtree(TMP)
    print("\n== CLEAN ==")


if __name__ == "__main__":
    main()
