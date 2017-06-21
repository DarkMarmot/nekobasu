

class FrameForker {

    constructor(bus) {

        this._bus = bus;
        this._targets = []; // frames to join or fork into
        this._index = bus._frames.length;

    };

    // handle is a multi-emit

    handle(wire, msg, source, topic){

        const len = this._targets.length;
        for(let i = 0; i < len; i++){
            const frame = this._targets[i];
            frame.handle(wire, msg, source, topic);
        }

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

        this._targets.push(frame);

    };

    destroy() {

    };


}

export default FrameForker;


