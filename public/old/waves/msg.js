

function Msg(def) {

        this.action = def.action;
        this.value = null;
        this.stateful = false;

}

Msg.prototype.handle = function handle(frame, wire, msg, source, topic){

        const nextMsg = this.action(msg, source, topic);
        frame.emit(wire, nextMsg, source, topic);

};



export default Msg;