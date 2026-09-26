# Strips // line comments from the game's JS for the published page (build.py). A small lexer walks the code so a
# "//" inside a string, a template literal (with its ${…} holes) or a regular expression is left alone. Block
# comments are kept (there are almost none), and so is every line break, so line numbers in errors still match.
REGEX_AFTER = set("(,=:[!&|?{};+-*%<>~^")
KEYWORDS = ("return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await", "delete", "instanceof", "new")

def strip(js):
    out, i, n = [], 0, len(js)
    stack = []            # template-literal nesting: each entry counts the open braces inside that ${ … }
    last = ""             # the last significant character of code (for telling a regex from a division)
    word = ""             # the last identifier, when the last token was one
    def regex_ok():
        if not last: return True
        if last in REGEX_AFTER: return True
        return word in KEYWORDS and last.isalnum()
    while i < n:
        c = js[i]
        if c == "/" and i + 1 < n and js[i + 1] == "/":
            j = js.find("\n", i)
            j = n if j < 0 else j
            while out and out[-1] in " \t": out.pop()   # the spaces that led up to the comment go with it
            i = j; continue
        if c == "/" and i + 1 < n and js[i + 1] == "*":
            j = js.find("*/", i + 2); j = n if j < 0 else j + 2
            out.append(js[i:j]); i = j; continue
        if c in "'\"":
            j = i + 1
            while j < n and js[j] != c:
                if js[j] == "\\": j += 1
                elif js[j] == "\n": raise ValueError(f"unterminated string at {i}")
                j += 1
            out.append(js[i:j + 1]); i = j + 1; last, word = c, ""; continue
        if c == "`" or (c == "}" and stack and stack[-1] == 0):
            if c == "}": stack.pop()
            j = i + 1
            while j < n:
                if js[j] == "\\": j += 2; continue
                if js[j] == "`": j += 1; break
                if js[j] == "$" and j + 1 < n and js[j + 1] == "{": stack.append(0); j += 2; break
                j += 1
            else: raise ValueError(f"unterminated template at {i}")
            out.append(js[i:j]); i = j; last, word = ("`" if js[j - 1] == "`" else "{"), ""; continue
        if c == "/" and regex_ok():
            j, cls = i + 1, False
            while j < n:
                d = js[j]
                if d == "\\": j += 2; continue
                if d == "\n": raise ValueError(f"unterminated regex at {i}: {js[i:i+40]!r}")
                if d == "[": cls = True
                elif d == "]": cls = False
                elif d == "/" and not cls: break
                j += 1
            j += 1
            while j < n and js[j].isalpha(): j += 1
            out.append(js[i:j]); i = j; last, word = "/", ""; continue
        if c == "{" and stack: stack[-1] += 1
        elif c == "}" and stack: stack[-1] -= 1
        if c.isalnum() or c in "_$":
            j = i
            while j < n and (js[j].isalnum() or js[j] in "_$"): j += 1
            word = js[i:j]; out.append(word); last = word[-1]; i = j; continue
        if not c.isspace(): last, word = c, ""
        out.append(c); i += 1
    if stack: raise ValueError("unbalanced template literal")
    return "".join(out)
