import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
    entry: 'src/main.js',
    format: 'cjs',
    dest: './dist/catbus.min.js', // equivalent to --output
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**' // only transpile our source code
        }),
        uglify()
    ],
    moduleName: 'Catbus'
};