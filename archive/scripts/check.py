import sys, re

def check(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    idx = content.find('return (')
    if idx == -1: return
    
    # offset
    offset = content[:idx].count('\n') + 1

    content = content[idx:]
    content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
    
    tags = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for m in re.finditer(r'<(/?)([A-Za-z0-9_]+)[^>]*?(/?)>', line):
            is_close = m.group(1) == '/'
            tag = m.group(2)
            is_self_close = m.group(3) == '/' or '/>' in m.group(0)
            
            if is_self_close or tag in ['input', 'path', 'circle', 'ellipse', 'rect', 'line', 'svg', 'br', 'hr', 'img', 'DocumentUploadDropzone']: 
                continue
                
            if not is_close:
                tags.append((tag, i + offset))
            else:
                if not tags:
                    print(f"Unmatched closing tag </{tag}> at line {i + offset}")
                elif tags[-1][0] == tag:
                    tags.pop()
                else:
                    print(f"Mismatched closing tag </{tag}> at line {i + offset}. Expected </{tags[-1][0]}> from line {tags[-1][1]}")

    print("Unclosed tags:", tags)

check('src/components/SymptomAI.tsx')
