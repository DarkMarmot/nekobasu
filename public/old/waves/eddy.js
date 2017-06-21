

class Eddy {

    constructor(def){

        this.keep = def.keep;
        this.value = null;
        this.stateful = true;

    }

    handle(frame, wire, msg, source, topic){

        const nextMsg = this.action(msg, source, topic);
        frame.emit(wire, nextMsg, source, topic);

    }

}


export default Eddy;