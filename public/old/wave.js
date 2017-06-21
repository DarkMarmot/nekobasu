
function pass(frame, wire, msg, source, topic) {

    frame.emit(wire, msg, source, topic);

}


class Wave {

    constructor(def){

        this.process = (def && def.process) ? this[def.process] : pass;
        this.action = def ? (def.stateful ? def.action(...def.args) : def.action) : null;

    };

    handle(frame, wire, msg, source, topic) {
        this.process(frame, wire, msg, source, topic)
    };

    run(frame, wire, msg, source, topic) {

        this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    };

    msg(frame, wire, msg, source, topic) {

        msg = this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    }

    source(frame, wire, msg, source, topic) {

        source = this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    }

    filter(frame, wire, msg, source, topic) {

        if(!this.action(msg, source, topic))
            return;
        frame.emit(wire, msg, source, topic);

    };

    split(frame, wire, msg, source, topic) {

        const len = msg.length || 0;
        for(let i = 0; i < len; i++){
            const chunk = msg[i];
            frame.emit(wire, chunk, source, topic);
        }

    };

    delay(frame, wire, msg, source, topic) {

        function callback(){
            frame.emit(wire, msg, source, topic);
        }

        setTimeout(callback, this.action(msg, source, topic) || 0, msg, source, topic);

    };

}


export default Wave;