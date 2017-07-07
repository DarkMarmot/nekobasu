import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
    entry: 'src/catbus.js',
    format: 'es',
    dest: './dist/catbus.es.js', // equivalent to --output
    plugins: [
        resolve(),
        // babel({
        //     exclude: 'node_modules/**' // only transpile our source code
        // }),
        false && uglify()
    ],
    moduleName: 'Catbus'
};