

class Source {

    constructor(def){

        this.action = def.action;
        this.value = null;
        this.stateful = false;

    }

    handle(frame, wire, msg, source, topic){

        const nextSource = this.action(msg, source, topic);
        frame.emit(wire, msg, nextSource, topic);

    }

}


export default Source;