
import Tap from './waves/tap.js';
import Msg from './waves/msg.js';
import Source from './waves/source.js';
import Filter from './waves/filter.js';
import Delay from './waves/delay.js';
import Scan from './waves/scan.js';
import SkipDupes from './waves/skipDupes.js'
import LastN from './waves/lastN.js';
import FirstN from './waves/firstN.js';
import All from './waves/all.js';
import Group from './waves/group.js';
import Pass from './waves/pass.js';

// const PASS = {
//
//     handle: function(frame, wire, msg, source, topic) {
//         frame.emit(wire, msg, source, topic);
//     }
//
// };

const PASS = new Pass();

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

    pass(def) {
        return new Pass(def);
    }

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

    skipDupes(def) {
        return new SkipDupes(def);
    };

    delay(def) {
        return new Delay(def);
    };

    scan(def) {
        return new Scan(def);
    };

    group(def) {
        return new Group(def);
    };

    lastN(def) {
        return new LastN(def.args[0]);
    };

    firstN(def) {
        return new FirstN(def.args[0]);
    };

    all() {
        return new All();
    };


    split() {
        return SPLIT;
    };



}


export default Handler;