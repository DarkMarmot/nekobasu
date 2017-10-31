//run mocha from project root

const assert = require('assert');
const Catbus = require('../dist/catbus.umd.js');




describe('Meow Parse', function(){

    it('can parse one word', function(){

        const m = Catbus.meow('cat');

        assert.equal(m.length, 1);
        assert.equal(m[0].words.length, 1);
        assert.equal(m[0].words[0].name, 'cat');

    });

    it('can parse a lot', function(){

        const m = Catbus.meow('cat?.bunny?.frog:dog, turtle * removeEmpty, toFur > furCoat');

        console.log(m);
        //assert.equal(m.length, 1);
        //assert.equal(m[0].words.length, 1);
        //assert.equal(m[0].words[0].name, 'cat');

    });

});
