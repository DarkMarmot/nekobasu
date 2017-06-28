
import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


function ArraySource(name, value){

    this.name = name;
    this.value = value;
    this.stream = new PassStream(name);

}

ArraySource.prototype.pull = function pull(){

    push(this.stream, this.value, this.value.length, this.name);

};

function push(stream, arr, len, name){
    for(let i = 0; i < len; ++i) {
        stream.handle(arr[i], name, '');
    }
}


NOOP_SOURCE.addStubs(ArraySource);

export default ArraySource;
