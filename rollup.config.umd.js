import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
    entry: 'src/main.js',
    format: 'umd',
    dest: 'bundle.umd.js', // equivalent to --output
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**' // only transpile our source code
        }),
        (false && uglify())
    ],
    moduleName: 'moop',
    sourceMap: true
};