import subprocess

try:
    result = subprocess.check_output('npx tsc --noEmit', shell=True, stderr=subprocess.STDOUT, text=True)
    print("Success")
except subprocess.CalledProcessError as e:
    with open('err.txt', 'w', encoding='utf-8') as f:
        f.write(e.output)
