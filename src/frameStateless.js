
import Wave from './wave.js';

class FrameStateless {

    constructor(bus, def) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._process = new Wave(def);

    };


    handle(wire, msg, source, topic){

        this._process.handle(this, wire, msg, source || wire.name , topic);

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return false;
    };

    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

export default FrameStateless;


