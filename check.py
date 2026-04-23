import os

files = [
    'src/components/admin/dashboard/context/DashboardContext.tsx',
    'src/app/(admin)/admin/pos/page.tsx',
    'src/app/(admin)/admin/queue/page.tsx',
    'src/app/(admin)/admin/finance/expenses/page.tsx',
]

for f_path in files:
    full_path = os.path.join('kallayi_car_spa_frontend', f_path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                if '127.0.0.1:8001' in line:
                    print(f"[{f_path}] Line {i+1}: {line.strip()}")
            
print("Done")
