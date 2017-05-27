

class Delay {

    constructor(def){

        this.action = def.action;
        this.value = null;
        this.stateful = false;

    }

    handle(frame, wire, msg, source, topic){

        if(this.action(msg, source, topic))
            frame.emit(wire, msg, source, topic);

    }

}


export default Delay;