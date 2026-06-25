import { readFileSync, existsSync, readdirSync, mkdirSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'

const SKILLS_DIR_NAME = 'skills'

export interface SkillInfo {
  name: string
  description: string
  content: string
}

export class SkillManager {
  private skillsDir: string

  constructor(baseDir: string) {
    this.skillsDir = join(baseDir, SKILLS_DIR_NAME)
  }

  list(): string[] {
    if (!existsSync(this.skillsDir)) return []
    const entries = readdirSync(this.skillsDir, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort()
  }

  info(name: string): SkillInfo | null {
    const skillPath = join(this.skillsDir, name, 'SKILL.md')
    if (!existsSync(skillPath)) return null
    const raw = readFileSync(skillPath, 'utf-8')
    const desc = raw.startsWith('#') ? raw.split('\n')[0]?.replace(/^#\s*/, '') ?? '' : ''
    return { name, description: desc, content: raw }
  }

  getContent(name: string): string | null {
    const skillPath = join(this.skillsDir, name, 'SKILL.md')
    if (!existsSync(skillPath)) return null
    return readFileSync(skillPath, 'utf-8')
  }

  install(name: string, sourcePath: string): string {
    const targetDir = join(this.skillsDir, name)
    if (existsSync(targetDir)) throw new Error(`Skill '${name}' already installed.`)
    mkdirSync(targetDir, { recursive: true })
    cpSync(sourcePath, targetDir, { recursive: true })
    return `Skill '${name}' installed.`
  }

  uninstall(name: string): string {
    const targetDir = join(this.skillsDir, name)
    if (!existsSync(targetDir)) throw new Error(`Skill '${name}' not found.`)
    rmSync(targetDir, { recursive: true, force: true })
    return `Skill '${name}' uninstalled.`
  }
}
