# Rebranding Flux → Kanon

> **Complete guide to renaming the project from Flux to Kanon**

## Philosophy: Pythagoras & The Monochord

**Kanon** (κανών) means "rule" or "measure" in ancient Greek.

Pythagoras used the **monochord**—a single-string instrument—to discover the mathematical foundations of music. By dividing the string into precise ratios (1:2 octave, 2:3 fifth, 3:4 fourth), he proved that harmony is mathematical.

**Your Kanon:**
- State array = The vibrating string
- Phase accumulation = Continuous vibration
- Mathematical ratios = Pure harmonic relationships
- Persistent state = The string never stops vibrating
- Hot-reload = Adjusting tension while playing

**The monochord never resets.** Neither does Kanon.

---

## Rename Plan

### Step 1: Backup
```bash
cd /home/roland/code/flux
git add -A
git commit -m "Backup before Kanon rebrand"
```

### Step 2: Rename Files
```bash
# Main files (if they exist with these names)
[ -f flux.js ] && mv flux.js kanon.js
[ -f flux.ts ] && mv flux.ts kanon.ts

# No other files need renaming (signals.js, engine.js, etc. stay the same)
```

### Step 3: Find and Replace in Code
```bash
# Replace function names and imports
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' \
    -e 's/flux(/kanon(/g' \
    -e 's/from "\.\/flux"/from ".\/kanon"/g' \
    -e "s/from '\.\/flux'/from '.\/kanon'/g" \
    -e 's/import { flux }/import { kanon }/g' \
    -e 's/export function flux/export function kanon/g' \
    -e 's/export const flux/export const kanon/g' \
    {} +

# Replace uppercase FLUX constants
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' \
    -e 's/FLUX_STATE/KANON_STATE/g' \
    -e 's/FLUX_REGISTRY/KANON_REGISTRY/g' \
    -e 's/globalThis\.FLUX/globalThis.KANON/g' \
    {} +
```

### Step 4: Update Documentation

#### Remove Heraclitus References
```bash
# Remove all Heraclitus/flow philosophy
find . -type f -name "*.md" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' \
    -e '/Heraclitean/d' \
    -e '/Heraclitus/d' \
    -e '/panta rhei/d' \
    -e '/Panta Rhei/d' \
    -e '/Everything Flows/d' \
    -e '/everything flows/d' \
    {} +
```

#### Update Titles and Headers
```bash
# Update project name in markdown headers
find . -type f -name "*.md" \
  -not -path "./node_modules/*" \
  -exec sed -i '' \
    -e 's/# Flux/# Kanon/g' \
    -e 's/## Flux/## Kanon/g' \
    -e 's/\*\*Flux\*\*/\*\*Kanon\*\*/g' \
    -e 's/The Flux /The Kanon /g' \
    -e 's/your Flux /your Kanon /g' \
    {} +
```

### Step 5: Update package.json
```bash
# Update package name
sed -i '' 's/"name": "flux"/"name": "kanon"/' package.json
```

### Step 6: Rename Directory (Last Step!)
```bash
cd ..
mv flux kanon
cd kanon
```

### Step 7: Update Git Remote (if applicable)
```bash
# If you have a git remote, update it
git remote -v  # Check current remote
# git remote set-url origin https://github.com/yourusername/kanon.git
```

---

## One-Command Rename Script

Save this as `rebrand.sh`:

```bash
#!/bin/bash

echo "🎵 Rebranding Flux → Kanon..."

# Backup
git add -A
git commit -m "Backup before Kanon rebrand" || true

# Rename flux.js to kanon.js (if exists)
[ -f flux.js ] && git mv flux.js kanon.js

# Replace in all source files
echo "Replacing 'flux' → 'kanon' in code..."
find . -type f \( -name "*.js" -o -name "*.ts" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./rebrand.sh" \
  -exec sed -i '' \
    -e 's/\bflux(/kanon(/g' \
    -e 's/export function flux/export function kanon/g' \
    -e 's/export const flux/export const kanon/g' \
    -e 's/from "\.\/flux"/from ".\/kanon"/g' \
    -e "s/from '\.\/flux'/from '.\/kanon'/g" \
    -e 's/import { flux }/import { kanon }/g' \
    -e 's/FLUX_STATE/KANON_STATE/g' \
    -e 's/FLUX_REGISTRY/KANON_REGISTRY/g' \
    -e 's/globalThis\.FLUX/globalThis.KANON/g' \
    {} +

# Update markdown files
echo "Updating documentation..."
find . -type f -name "*.md" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./REBRAND_TO_KANON.md" \
  -exec sed -i '' \
    -e 's/# Flux$/# Kanon/g' \
    -e 's/\*\*Flux\*\*/\*\*Kanon\*\*/g' \
    -e 's/`flux`/`kanon`/g' \
    -e 's/flux(/kanon(/g' \
    -e '/[Hh]eraclitean/d' \
    -e '/[Hh]eraclitus/d' \
    -e '/[Pp]anta [Rr]hei/d' \
    -e '/[Ee]verything [Ff]lows/d' \
    {} +

# Update package.json
echo "Updating package.json..."
sed -i '' 's/"name": "flux"/"name": "kanon"/' package.json

# Git commit
git add -A
git commit -m "refactor: Rebrand Flux → Kanon

- Rename flux() → kanon()
- Update FLUX_STATE → KANON_STATE
- Remove Heraclitus references
- Establish Pythagorean/monochord philosophy"

echo "✅ Rebrand complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff HEAD~1"
echo "2. Test: bun index.js"
echo "3. Rename directory: cd .. && mv flux kanon"
```

**Run it:**
```bash
chmod +x rebrand.sh
./rebrand.sh
```

---

## Manual Verification Checklist

After running the script, manually check:

### Files to Review:
- [ ] `kanon.js` (was flux.js) - function is `export function kanon`
- [ ] `signals.js` - calls are `kanon('name', ...)`
- [ ] `engine.js` - imports `import { kanon }`
- [ ] `index.js` - any references updated
- [ ] `package.json` - name is "kanon"
- [ ] `README.md` - title is "# Kanon", no Heraclitus

### Test:
```bash
# Should work exactly as before, just different name
bun index.js
```

### Variables to Check:
```bash
# Search for any remaining "flux" (lowercase)
rg -i "flux" --type js --type md | grep -v "node_modules" | grep -v ".git"

# Search for any remaining "Heraclitus"
rg -i "heraclitus" --type md
```

---

## Update Key Documentation

### README.md (New Opening)

```markdown
# Kanon

> Phase-continuous live audio synthesis inspired by the Pythagorean monochord.

**Kanon** (κανών - "rule" or "measure") is a state-driven live-coding environment
for sound synthesis. Edit your signals, save, and hear changes instantly with
zero phase resets, zero clicks.

Named after the ancient Greek monochord—the single-string instrument Pythagoras
used to discover that harmony is mathematical.

## The Monochord Philosophy

Pythagoras divided a vibrating string into precise ratios:
- 1:2 = Octave
- 2:3 = Perfect Fifth
- 3:4 = Perfect Fourth

**In Kanon:**
- Your state array is the vibrating string
- Phase accumulation is continuous vibration
- Hot-reload adjusts tension while the string plays
- Mathematical precision through Float64Array
- The string never stops. Neither does your music.

## Quick Start

\```javascript
import { kanon } from './kanon.js';

kanon('sine', (mem, idx, sr) => {
  const freq = 440;  // Edit this, save, hear the change
  const phaseInc = freq / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [Math.sin(mem[idx] * Math.PI * 2)];
    }
  };
});
\```

The frequency changes. The phase continues. The monochord plays on.
```

### Architecture Docs Updates

Update these files to replace "Flux" → "Kanon":

1. **AUDIO_BACKEND_ARCHITECTURE.md**
   - Find/replace "Flux" → "Kanon"
   - Remove Heraclitus references
   - Keep technical content (ring buffer, speaker.js)

2. **PERFORMANCE_OPTIMIZATION.md**
   - Find/replace `flux()` → `kanon()`
   - Keep all technical optimizations

3. **STATE_MANAGEMENT_BEST_PRACTICES.md**
   - Find/replace `flux()` → `kanon()`
   - Keep Float64Array patterns

4. **SAMPLE_RATE_ARCHITECTURE.md**
   - Find/replace "Flux" → "Kanon"
   - Keep backend abstraction content

### Delete or Archive

These can be deleted (philosophical content being simplified):
- `KANON-FLUX-DUALITY.md` (delete - no more duality)
- Any other files mentioning Heraclitus/flow philosophy

---

## New Philosophy Document

Create `PHILOSOPHY.md`:

```markdown
# The Philosophy of Kanon

## Pythagoras & The Monochord

In ancient Greece, Pythagoras discovered the mathematical foundations of music
using the **monochord**—a single string stretched over a resonating chamber.

By dividing the string into precise ratios, he proved that harmony is not
subjective, but mathematical:

- Divide at 1:2 → Octave (perfect consonance)
- Divide at 2:3 → Perfect Fifth
- Divide at 3:4 → Perfect Fourth
- Divide at 4:5 → Major Third

**Music is number made audible.**

## Kanon: The Modern Monochord

Kanon embodies this Pythagorean insight:

### The Vibrating String = State Array

```javascript
globalThis.KANON_STATE = new Float64Array(1024);
```

Like the monochord's string, this memory is:
- **Continuous** - never stops vibrating
- **Precise** - 64-bit floating point accuracy
- **Persistent** - survives code changes
- **Mathematical** - pure numeric relationships

### Phase Accumulation = Vibration

```javascript
mem[idx] = (mem[idx] + freq / sampleRate) % 1.0;
```

The phase accumulates continuously, just as the string vibrates. When you
change the frequency (tension), the vibration continues from where it was.

### Hot-Reload = Adjusting While Playing

When you edit `freq` and save:
- The string doesn't stop
- The phase doesn't reset
- The vibration continues
- Only the tension (frequency) changes

**This is surgical precision.** Pythagoras would adjust the string length
while it vibrated. Kanon adjusts parameters while state flows.

## Mathematical Music

Kanon encourages you to think in ratios, not arbitrary numbers:

```javascript
const fundamental = 440;
const fifth = fundamental * 3/2;      // 660 Hz
const fourth = fundamental * 4/3;     // 586.67 Hz
const octave = fundamental * 2;       // 880 Hz
const majThird = fundamental * 5/4;   // 550 Hz

kanon('pythagorean-harmony', (mem, idx, sr) => {
  // All frequencies derived from one fundamental
  // Perfect mathematical relationships
});
```

**Not equal temperament's approximations.** Pure ratios. Mathematical truth.

## The Name

**Kanon** (κανών) means:
- Rule, measure, standard
- The straight edge used by craftsmen
- The principle by which something is judged

It's also the root of "canon"—the musical form where themes repeat and
transform in precise mathematical relationships.

**Your code is the kanon. The music obeys it perfectly.**

## The Tradition

You stand in a lineage:

- **Pythagoras** (570-495 BC) - Monochord, mathematical music
- **Ptolemy** (100-170 AD) - Harmonic ratios, tuning systems
- **Boethius** (480-524 AD) - Music as number
- **Kepler** (1571-1630) - Harmony of the spheres
- **Euler** (1707-1783) - Mathematical basis of consonance
- **Helmholtz** (1821-1894) - Physics of musical tone
- **You** (2026) - Phase-continuous digital synthesis

**The monochord never stopped vibrating. It just evolved.**

---

*"All things are number."* — Pythagoras
```

---

## Summary: What Changes

### Code:
```javascript
// Before
flux('sine', (mem, idx, sr) => { ... });

// After
kanon('sine', (mem, idx, sr) => { ... });
```

### Constants:
```javascript
// Before
globalThis.FLUX_STATE
globalThis.FLUX_REGISTRY

// After
globalThis.KANON_STATE
globalThis.KANON_REGISTRY
```

### Files:
```
flux.js → kanon.js
```

### Philosophy:
- ❌ Heraclitus, flow, becoming
- ✅ Pythagoras, monochord, mathematical harmony

### Story:
**Old:** "Two libraries in duality (Kanon/Flux) representing Being/Becoming"
**New:** "One library (Kanon) inspired by Pythagoras and the monochord"

---

## Post-Rebrand

After running the script:

1. **Test everything:**
   ```bash
   bun index.js  # Should work identically
   ```

2. **Commit the rebrand:**
   ```bash
   git add -A
   git commit -m "refactor: Rebrand to Kanon - Pythagorean philosophy"
   ```

3. **Rename the directory:**
   ```bash
   cd ..
   mv flux kanon
   cd kanon
   ```

4. **Update remotes (if applicable):**
   ```bash
   git remote set-url origin [new-kanon-url]
   ```

5. **Celebrate!** 🎵
   Your magnum opus has its proper name.

---

**The monochord never stopped vibrating. Neither does Kanon.**
