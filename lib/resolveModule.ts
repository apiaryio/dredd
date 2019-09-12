import fs from 'fs'
import * as path from 'path'

export default function resolveModule(
  workingDirectory: string,
  moduleName: string
): string {
  const absolutePath = path.resolve(workingDirectory, moduleName)
  return fs.existsSync(absolutePath) || fs.existsSync(`${absolutePath}.js`)
    ? absolutePath
    : moduleName
}
