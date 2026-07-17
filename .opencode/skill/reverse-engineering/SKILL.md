---
name: reverse-engineering
description: Use when analyzing binaries, decompiling, debugging, unpacking malware, or performing static/dynamic analysis. Trigger keywords: reverse engineer, decompile, disassemble, binary analysis, Ghidra, Radare2, GDB, malware analysis, unpack.
---

# Reverse Engineering Toolkit

Binary analysis, decompilation, debugging, and malware analysis toolkit.

## Static Analysis

### Initial Triage
```bash
# File identification
file <binary>

# Security hardening check
checksec --file=<binary>

# Strings extraction
strings <binary> | sort -u > strings.txt

# Import/export analysis
objdump -T <binary>   # dynamic symbols
objdump -t <binary>   # all symbols
readelf -s <binary>   # ELF symbols
```

### Disassembly & Decompilation

**Ghidra** (GUI-based):
```bash
# Create project and import binary
ghidraRun
# File → Import File → Analyze (auto-analysis)
```

**Radare2** (CLI-based):
```bash
# Open binary for analysis
r2 -A <binary>

# Inside r2:
aaa          # full auto-analysis
afl          # list functions
pdf @main    # disassemble main
izz          # list strings
iE           # entry points
/V <pattern> # search for pattern
```

**objdump** (quick disassembly):
```bash
objdump -d -M intel <binary> > disasm.txt
```

## Dynamic Analysis

### Debugging with GDB
```bash
# Start with PwnDBG or GEF
gdb -q <binary>

# Common GDB commands:
b *main           # breakpoint at main
b *0x400123       # breakpoint at address
r <args>          # run with args
c                 # continue
ni / si           # next instruction / step instruction
x/10gx $rsp       # examine 10 giant words from stack pointer
info registers    # show registers
vmmap             # memory map (pwndbg)
```

### Tracing
```bash
# System call tracing
strace -f -o trace.log <binary>

# Library call tracing
ltrace -o libtrace.log <binary>
```

### Memory Analysis
```bash
# Valgrind for memory errors
valgrind --leak-check=full --show-leak-kinds=all <binary>

# AddressSanitizer (compile with -fsanitize=address)
```

## Malware Analysis

### Safe Environment
```bash
# Create isolated analysis VM
docker run -it --rm --network=none -v $(pwd)/sample:/sample:ro ubuntu bash
```

### Unpacking
```bash
# Detect packer
binwalk -Me <binary>
strings <binary> | grep -i "upx\|aspack\|themida"

# UPX unpacking
upx -d <binary>
```

### Behavioral Analysis
```bash
# Monitor file system changes
inotifywait -mr /tmp/

# Network traffic
tcpdump -i any -w capture.pcap
```

## Buffer Overflow Analysis

```bash
# Find vulnerable functions
objdump -d <binary> | grep -E "call.*gets|call.*strcpy|call.*sprintf|call.*scanf"

# Check protections
checksec --file=<binary>    # Canary, NX, PIE, RELRO, FORTIFY

# Fuzzing
afl-fuzz -i inputs/ -o outputs/ -- ./binary @@

# Exploit development with pwntools
python3 -c "from pwn import *; ELF('<binary>')"
```

## Report Template

```markdown
# Binary Analysis Report: <name>

## File Information
- Type: <ELF/PE/Mach-O>
- Architecture: <x86/x64/ARM>
- Protections: <Canary, NX, PIE, RELRO>

## Static Analysis
- Functions: <count>
- Strings: <count>
- Interesting strings: <list>
- Suspicious imports: <list>

## Dynamic Analysis
- Entry point behavior: <description>
- Memory allocation patterns: <description>
- Network activity: <description>

## Vulnerabilities Found
| # | Location | Type | Severity | Description |
|---|----------|------|----------|-------------|

## Recommendations
```