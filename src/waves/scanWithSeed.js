
function ScanWithSeed(def) {

        this.action = def.action;
        this.value = def.seed;
        this.stateful = true;

}

ScanWithSeed.prototype.handle = function handle(frame, wire, msg, source, topic){

        this.value = this.action(this.value, msg, source, topic);
        frame.emit(wire, this.value, source, topic);

};

export default ScanWithSeed;
