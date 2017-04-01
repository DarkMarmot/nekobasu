
import Scope from './scope.js';

class Catbus {

    constructor(name){

        this._name = name;
        this._batchQueue = [];
        this._scope = new Scope(name);

    }

    get name() { return this._name; };
    get scope() { return this._scope; };


    flush(){

        let cycles = 0;
        let q = this._batchQueue;
        this._batchQueue = [];

        while(q.length) {

            while (q.length) {
                const stream = q.shift();
                stream.fireContent();
            }

            q = this._batchQueue;
            this._batchQueue = [];

            cycles++;
            if(cycles > 10)
                throw new Error('Flush batch cycling loop > 10.', q);

        }

    };

}

export default Catbus;
