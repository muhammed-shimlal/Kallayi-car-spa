import os
import re

files_to_fix = [
    r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\dashboard\page.tsx",
    r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\queue\page.tsx"
]

for fpath in files_to_fix:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add API_BASE definition
    if "const API_BASE =" not in content:
        import_lucide = "lucide-react';"
        import_toast = "import toast from 'react-hot-toast';"
        
        insert_str = "\nconst API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';\n"
        
        if import_lucide in content:
            content = content.replace(import_lucide, import_lucide + "\n" + insert_str, 1)
        elif import_toast in content:
            content = content.replace(import_toast, import_toast + "\n" + insert_str, 1)

    # 2. Remove the duplicate local declaration in dashboard
    content = content.replace("const API_BASE = 'http://127.0.0.1:8001/api';", "")

    # 3. Replace all literal endpoint strings: 'http://127.0.0.1:8001/api/endpoint/' -> `${API_BASE}/endpoint/`
    content = re.sub(r"'http://127\.0\.0\.1:8001/api([^']*)'", r"`${API_BASE}\1`", content)

    # 4. Replace alerts in dashboard with toasts
    if "dashboard" in fpath:
        content = content.replace('alert(`SUCCESS! We found ${debtors.length} customers in the database who owe money.`);', 'toast.success(`SUCCESS! We found ${debtors.length} customers in the database who owe money.`);')
        content = content.replace('alert(`API FAILED! Khata Status: ${khataRes?.status}`);', 'toast.error(`API FAILED! Khata Status: ${khataRes?.status}`);')
        content = content.replace('alert("CRASH DETECTED!\\n\\nReason: " + error.message + "\\n\\nStack: " + error.stack);', 'toast.error("CRASH DETECTED!\\n\\nReason: " + error.message);')

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed {fpath}")
