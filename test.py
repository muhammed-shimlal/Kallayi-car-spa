import re

filepath = r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\context\DashboardContext.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    original = f.read()

# Make a backup
with open(filepath + ".bak", "w", encoding='utf-8') as f:
    f.write(original)

# We want to replace the `// --- Data States ---` down to `// --- Service Menu CRUD ---`
# and also replace some functions with useMutation.
# It is simpler to just rewrite the file content if we have access to it, but since we are automating:

new_code = """
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
"""

if "from '@tanstack/react-query'" not in original:
    original = original.replace("import { createContext, useContext } from 'react';", "import { createContext, useContext } from 'react';\n" + new_code)

# Remove the fetchDashboardData block:
fetch_block_regex = r"    const fetchDashboardData = useCallback\(async \(\) => \{.*?\n    \}, \[router\]\);\n"
original = re.sub(fetch_block_regex, "", original, flags=re.DOTALL)

# Let's just create a new file entirely inside Python using the known structure to be safe.
