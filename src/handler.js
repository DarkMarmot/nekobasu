
import Tap from './waves/tap.js';
import Msg from './waves/msg.js';
import Source from './waves/source.js';
import Filter from './waves/filter.js';
import Delay from './waves/delay.js';
import Scan from './waves/scan.js';


const PASS = {

    handle: function(frame, wire, msg, source, topic) {
        frame.emit(wire, msg, source, topic);
    }

};

const SPLIT = {

    handle: function(frame, wire, msg, source, topic) {

        const len = msg.length || 0;
        for(let i = 0; i < len; i++){
            const chunk = msg[i];
            frame.emit(wire, chunk, source, topic);
        }

    }

};


class Handler {

    constructor(def){

        this.process = (def && def.process) ? this[def.process](def) : PASS;

    };

    handle(frame, wire, msg, source, topic) {
        this.process.handle(frame, wire, msg, source, topic)
    };

    tap(def) {
        return new Tap(def);
    };


    msg(def) {
        return new Msg(def);
    }

    source(def) {
        return new Source(def);
    }

    filter(def) {
        return new Filter(def);
    };

    delay(def) {
        return new Delay(def);
    };

    scan(def) {
        return new Scan(def);
    };

    split() {
        return SPLIT;
    };



}


export default Handler;