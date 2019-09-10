import path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import nodeExternals from 'rollup-plugin-node-externals'
import commonjs from 'rollup-plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'
import packageJson from './package.json'

const buildCjs = {
  input: path.resolve(__dirname, packageJson.esnext),
  output: {
    format: 'cjs',
    file: path.resolve(__dirname, packageJson.main),
    exports: 'named'
  },
  plugins: [
    nodeExternals(),
    resolve({
      jsnext: true,
      preferBuiltins: true,
      extensions: ['.ts']
    }),
    json({
      compact: true
    }),
    typescript(),
    commonjs()
  ],
  onwarn(warning) {
    /**
     * Current build contains a lot of circular dependencies
     * originating from dependencies.
     * @todo Resolve circular dependencies in the code, or find a more
     * elegant way to supress those warnings.
     */
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      return null
    }
  }
}

export default buildCjs
