

import Wire from './wire.js';

class FrameMerger {

    constructor(bus) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._mergingWire = new Wire();

    };


    handle(wire, msg, source, topic){

        this.emit(this._mergingWire, msg, source, topic);

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

export default FrameMerger;


