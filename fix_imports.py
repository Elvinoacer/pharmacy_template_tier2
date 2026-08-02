import os
import re
from pathlib import Path

portal_dir = Path("app/portal")
for path in portal_dir.rglob("*.tsx"):
    content = path.read_text()
    
    # We want to match: import { ... } from "@/app/components/portal/PortalShell";
    # but it could be multi-line.
    # regex to find it:
    pattern = re.compile(r'import\s+\{([^}]+)\}\s+from\s+["\']@/app/components/portal/PortalShell["\'];', re.MULTILINE)
    
    def replacer(match):
        imports_str = match.group(1)
        imports = [x.strip() for x in imports_str.split(',')]
        imports = [x for x in imports if x]
        
        shell_imports = [x for x in imports if x == "PortalShell"]
        widget_imports = [x for x in imports if x != "PortalShell"]
        
        res = []
        if shell_imports:
            res.append(f'import {{ PortalShell }} from "@/app/components/portal/PortalShell";')
        if widget_imports:
            res.append(f'import {{ {", ".join(widget_imports)} }} from "@/app/components/portal/PortalWidgets";')
            
        return "\n".join(res)
    
    new_content = pattern.sub(replacer, content)
    if new_content != content:
        path.write_text(new_content)
        print(f"Fixed {path}")

