import os

migration_dir = r"c:\Users\Shadow\Desktop\COLDSPARK PANEL V1.3\supabase\migrations"
files = sorted(os.listdir(migration_dir))
output_file = r"c:\Users\Shadow\Desktop\COLDSPARK PANEL V1.3\all_migrations.sql"

print(f"Combining {len(files)} files...")
with open(output_file, 'w', encoding='utf-8') as outfile:
    for filename in files:
        if filename.endswith(".sql"):
            path = os.path.join(migration_dir, filename)
            # print(f"Processing {filename}")
            with open(path, 'r', encoding='utf-8') as infile:
                outfile.write(f"-- Migration: {filename}\n")
                outfile.write(infile.read())
                outfile.write("\n\n")

# Count lines
with open(output_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print(f"Total lines: {len(lines)}")
