import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/main.js',
    format: 'umd',
    dest: 'bundle.umd.js', // equivalent to --output
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**' // only transpile our source code
        })
    ],
    moduleName: 'moop',
    sourceMap: true
};