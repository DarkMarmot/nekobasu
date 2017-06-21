
import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


function ValueSource(name, value){

    this.name = name;
    this.value = value;
    this.stream = new PassStream(name);

}

ValueSource.prototype.pull = function pull(){

    this.stream.handle(this.value, this.name, '');

};


NOOP_SOURCE.addStubs(ValueSource);

export default ValueSource;
