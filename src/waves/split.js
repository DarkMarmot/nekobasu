

class Split {

    constructor(def){

        this.action = null;
        this.value = null;
        this.stateful = false;

    }

    handle(frame, wire, msg, source, topic){

        const len = msg.length || 0;
        for(let i = 0; i < len; i++){
            const chunk = msg[i];
            frame.emit(wire, chunk, source, topic);
        }

    }

}


export default Split;