import { readdirSync, readFileSync, existsSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../logger.js';

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

/**
 * Parse YAML-like frontmatter from a SKILL.md file.
 * Only extracts `name` and `description` fields.
 */
function parseSkillMd(filePath: string): { name: string; description: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const frontmatter = match[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    if (!nameMatch) return null;

    return {
      name: nameMatch[1].trim().replace(/^["']|["']$/g, ''),
      description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '',
    };
  } catch {
    logger.warn(`Failed to read SKILL.md: ${filePath}`);
    return null;
  }
}

/**
 * Scan a directory for SKILL.md files, reading skill info from each.
 */
function scanDirectory(baseDir: string, depth: number = 2): SkillInfo[] {
  const skills: SkillInfo[] = [];

  if (!existsSync(baseDir)) return skills;

  let entries: Dirent[];
  try {
    entries = readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = join(baseDir, entry.name);

    if (depth > 1) {
      // Recurse one level deeper
      skills.push(...scanDirectory(fullPath, depth - 1));
    }

    const skillFile = join(fullPath, 'SKILL.md');
    if (existsSync(skillFile)) {
      const info = parseSkillMd(skillFile);
      if (info) {
        skills.push({ ...info, path: fullPath });
      }
    }
  }

  return skills;
}

/**
 * Scan known OpenCode skill directories.
 *
 * Locations scanned:
 * 1. ~/.config/opencode/skills/ and ~/.config/opencode/skill/
 * 2. ./.opencode/skills/ and ./.opencode/skill/
 * 3. OpenCode external skill locations: ~/.claude/skills/ and ~/.agents/skills/
 */
export function scanAllSkills(): SkillInfo[] {
  const home = homedir();
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  const directories = [
    join(home, '.config', 'opencode', 'skills'),
    join(home, '.config', 'opencode', 'skill'),
    join(process.cwd(), '.opencode', 'skills'),
    join(process.cwd(), '.opencode', 'skill'),
    join(home, '.claude', 'skills'),
    join(home, '.agents', 'skills'),
  ];

  for (const dir of directories) {
    for (const skill of scanDirectory(dir, 1)) {
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        skills.push(skill);
      }
    }
  }

  logger.info(`Scanned ${skills.length} skills`);
  return skills;
}

/**
 * Format a list of skills into a readable string for display.
 */
export function formatSkillList(skills: SkillInfo[]): string {
  if (skills.length === 0) {
    return 'No skills found.';
  }

  const lines = skills.map((s, i) => {
    const desc = s.description ? ` - ${s.description}` : '';
    return `  ${i + 1}. ${s.name}${desc}`;
  });

  return `Available skills (${skills.length}):\n${lines.join('\n')}`;
}

/**
 * Find a skill by name (case-insensitive match).
 */
export function findSkill(skills: SkillInfo[], name: string): SkillInfo | undefined {
  const lower = name.toLowerCase();
  return skills.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().replace(/\s+/g, '-') === lower,
  );
}
