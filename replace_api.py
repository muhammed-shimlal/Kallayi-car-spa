import re
import os

files = [
    'src/components/admin/dashboard/context/DashboardContext.tsx',
    'src/app/(admin)/admin/pos/page.tsx',
    'src/app/(admin)/admin/queue/page.tsx',
    'src/app/(admin)/admin/finance/expenses/page.tsx',
]

API_CONSTANT_DECLARATION = "const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';"

for f_path in files:
    full_path = os.path.join('kallayi_car_spa_frontend', f_path)
    if not os.path.exists(full_path):
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. replace 'http://127.../api/endpoint/' -> `${API_BASE}/endpoint/`
    content = re.sub(r'[\'"]http://127\.0\.0\.1:8001/api/([^\'"]*)[\'"]', r'`${API_BASE}/\1`', content)
    
    # 2. replace remaining unwrapped backticks
    content = re.sub(r'http://127\.0\.0\.1:8001/api/', r'${API_BASE}/', content)
    
    # 3. Ensure API_CONSTANT_DECLARATION isn't mangled. Because we replaced `http.../api/` with `${API_BASE}/` above,
    # the constant declaration might look like: `const API_BASE = process.env.NEXT_PUBLIC_API_URL || '${API_BASE}';` or `... || 'http://127.0.0.1:8001/api';`
    content = re.sub(r'const API_BASE\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*[^;]+;', API_CONSTANT_DECLARATION, content)
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Processed {f_path}")
