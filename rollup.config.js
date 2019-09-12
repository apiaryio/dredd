import path from 'path';
import nodeResolve from 'rollup-plugin-node-resolve';
import nodeExternals from 'rollup-plugin-node-externals';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';
import packageJson from './package.json';

const resolve = () => {
  return nodeResolve({
    preferBuiltins: true,
    extensions: ['.ts']
  });
};

const buildCjs = {
  // input: path.resolve(__dirname, packageJson.esnext),
  input: path.resolve(__dirname, './demo.ts'),
  output: {
    format: 'cjs',
    file: path.resolve(__dirname, packageJson.main),
    exports: 'named'
  },
  plugins: [
    resolve(),
    nodeExternals({
      builtins: true
    }),
    json({
      compact: true
    }),
    typescript(),
    commonjs({
      namedExports: {
        proxyquire: ['noCallThru']
      }
    })
    // commonjs({
    // include: 'node_modules/**/*',
    // namedExports: {
    // 'node_modules/uuid/v4.js': ['default']
    // 'node_modules/proxyquire/index.js': ['noCallThru'],
    // 'node_modules/htmlencode/index.js': ['htmlEncode'],
    // 'node_modules/glob/glob.js': ['sync', 'hasMagic']
    // }
    // }),
  ]
  // onwarn(warning) {
  //   /**
  //    * Current build contains a lot of circular dependencies
  //    * originating from dependencies.
  //    * @todo Resolve circular dependencies in the code, or find a more
  //    * elegant way to supress those warnings.
  //    */
  //   // if (warning.code === 'CIRCULAR_DEPENDENCY') {
  //   //   return null;
  //   // }
  // }
};

export default buildCjs;
